import "server-only";

import { inflateRawSync } from "node:zlib";

const endOfCentralDirectorySignature = 0x06054b50;
const centralDirectorySignature = 0x02014b50;
const localFileHeaderSignature = 0x04034b50;
const maxZipEntries = 5_000;
const maxExtractedXmlBytes = 12 * 1024 * 1024;
const maxExtractedCharacters = 140_000;

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

export function extractHwpxText(archive: Buffer) {
  const entries = readCentralDirectory(archive);
  const sectionEntries = entries
    .filter((entry) => /^Contents\/section\d+\.xml$/i.test(entry.name))
    .sort((left, right) => sectionNumber(left.name) - sectionNumber(right.name));

  if (!sectionEntries.length) {
    throw new Error("HWPX section XML was not found");
  }

  const mimetypeEntry = entries.find((entry) => entry.name === "mimetype");
  if (mimetypeEntry) {
    const mimetype = readEntry(archive, mimetypeEntry).toString("utf8").trim();
    if (!/hwp|hwpx/i.test(mimetype)) {
      throw new Error("The uploaded ZIP is not an HWPX document");
    }
  }

  let extractedXmlBytes = 0;
  const paragraphs: string[] = [];

  for (const entry of sectionEntries) {
    extractedXmlBytes += entry.uncompressedSize;
    if (extractedXmlBytes > maxExtractedXmlBytes) {
      throw new Error("HWPX document content is too large");
    }

    const xml = readEntry(archive, entry).toString("utf8");
    paragraphs.push(...extractParagraphs(xml));
    if (paragraphs.join("\n").length >= maxExtractedCharacters) break;
  }

  const text = paragraphs.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("No readable text was found in the HWPX document");
  return text.slice(0, maxExtractedCharacters);
}

function readCentralDirectory(archive: Buffer) {
  const directoryEndOffset = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(directoryEndOffset + 10);
  const directoryOffset = archive.readUInt32LE(directoryEndOffset + 16);

  if (entryCount > maxZipEntries || directoryOffset >= archive.length) {
    throw new Error("Invalid HWPX ZIP directory");
  }

  const entries: ZipEntry[] = [];
  let offset = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    ensureReadable(archive, offset, 46);
    if (archive.readUInt32LE(offset) !== centralDirectorySignature) {
      throw new Error("Invalid HWPX central directory entry");
    }

    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraFieldLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const entryLength = 46 + fileNameLength + extraFieldLength + commentLength;
    ensureReadable(archive, offset, entryLength);

    entries.push({
      name: archive.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8"),
      compressionMethod: archive.readUInt16LE(offset + 10),
      compressedSize: archive.readUInt32LE(offset + 20),
      uncompressedSize: archive.readUInt32LE(offset + 24),
      localHeaderOffset: archive.readUInt32LE(offset + 42),
    });
    offset += entryLength;
  }

  return entries;
}

function findEndOfCentralDirectory(archive: Buffer) {
  const earliestOffset = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= earliestOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === endOfCentralDirectorySignature) {
      return offset;
    }
  }
  throw new Error("Invalid HWPX ZIP footer");
}

function readEntry(archive: Buffer, entry: ZipEntry) {
  const offset = entry.localHeaderOffset;
  ensureReadable(archive, offset, 30);
  if (archive.readUInt32LE(offset) !== localFileHeaderSignature) {
    throw new Error("Invalid HWPX local file entry");
  }

  const fileNameLength = archive.readUInt16LE(offset + 26);
  const extraFieldLength = archive.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
  ensureReadable(archive, dataOffset, entry.compressedSize);
  const compressed = archive.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) {
    const inflated = inflateRawSync(compressed);
    if (inflated.length !== entry.uncompressedSize) {
      throw new Error("HWPX ZIP entry size did not match");
    }
    return inflated;
  }
  throw new Error("Unsupported HWPX ZIP compression method");
}

function extractParagraphs(xml: string) {
  const paragraphs: string[] = [];
  const paragraphPattern = /<(?:[\w.-]+:)?p(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?p>/gi;

  for (const paragraphMatch of xml.matchAll(paragraphPattern)) {
    const runs: string[] = [];
    const textPattern = /<(?:[\w.-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?t>/gi;
    for (const textMatch of paragraphMatch[1].matchAll(textPattern)) {
      runs.push(
        decodeXmlEntities(
          textMatch[1]
            .replace(/<(?:[\w.-]+:)?lineBreak\s*\/?\s*>/gi, "\n")
            .replace(/<(?:[\w.-]+:)?tab\s*\/?\s*>/gi, "\t")
            .replace(/<[^>]+>/g, ""),
        ),
      );
    }

    const paragraph = runs.join("").replace(/[ \t]+/g, " ").trim();
    if (paragraph) paragraphs.push(paragraph);
  }

  return paragraphs;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function sectionNumber(name: string) {
  return Number.parseInt(name.match(/section(\d+)\.xml$/i)?.[1] ?? "0", 10);
}

function ensureReadable(archive: Buffer, offset: number, length: number) {
  if (offset < 0 || length < 0 || offset + length > archive.length) {
    throw new Error("Invalid HWPX ZIP bounds");
  }
}
