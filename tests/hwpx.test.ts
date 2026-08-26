import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { extractHwpxText } from "@/features/ocr/hwpx";

describe("extractHwpxText", () => {
  it("enforces the cumulative decompressed byte limit when ZIP metadata underreports a section", () => {
    const sevenMegabytes = Buffer.alloc(7 * 1024 * 1024, "x");
    const archive = createZip([
      { name: "Contents/section0.xml", content: sevenMegabytes },
      {
        name: "Contents/section1.xml",
        content: sevenMegabytes,
        advertisedUncompressedSize: 1,
      },
    ]);

    expect(() => extractHwpxText(archive)).toThrow(
      "HWPX document content is too large",
    );
  });
});

type ZipInput = {
  name: string;
  content: Buffer;
  advertisedUncompressedSize?: number;
};

function createZip(inputs: ZipInput[]) {
  const localEntries: Buffer[] = [];
  const centralEntries: Buffer[] = [];
  let localOffset = 0;

  for (const input of inputs) {
    const name = Buffer.from(input.name, "utf8");
    const compressed = deflateRawSync(input.content);
    const uncompressedSize =
      input.advertisedUncompressedSize ?? input.content.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localEntries.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralEntries.push(centralHeader, name);

    localOffset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralEntries);
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50, 0);
  footer.writeUInt16LE(inputs.length, 8);
  footer.writeUInt16LE(inputs.length, 10);
  footer.writeUInt32LE(centralDirectory.length, 12);
  footer.writeUInt32LE(localOffset, 16);

  return Buffer.concat([...localEntries, centralDirectory, footer]);
}
