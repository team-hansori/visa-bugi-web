export type ClientImageIssue =
  | "tooSmall"
  | "tooDark"
  | "tooBright"
  | "lowContrast"
  | "blurry"
  | "notDocument";

export type ClientImageInspection =
  | { accepted: true }
  | { accepted: false; issue: ClientImageIssue };

const sampleMaxDimension = 320;

/**
 * Runs a deliberately conservative, local-only image check before an OCR request.
 * It catches obvious capture problems without claiming to identify the form itself.
 */
export async function inspectApplicationFormImage(
  file: File,
): Promise<ClientImageInspection> {
  const bitmap = await createImageBitmap(file);

  try {
    const shortestSide = Math.min(bitmap.width, bitmap.height);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    if (shortestSide < 600 || longestSide < 900) {
      return { accepted: false, issue: "tooSmall" };
    }

    const aspectRatio = shortestSide / longestSide;
    if (aspectRatio < 0.42 || aspectRatio > 0.95) {
      return { accepted: false, issue: "notDocument" };
    }

    const scale = sampleMaxDimension / longestSide;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is not available");

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixelCount = canvas.width * canvas.height;
    const grayscale = new Float32Array(pixelCount);

    let luminanceSum = 0;
    let luminanceSquaredSum = 0;
    let neutralPixels = 0;
    let paperLikePixels = 0;
    let inkLikePixels = 0;

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);

      grayscale[pixel] = luminance;
      luminanceSum += luminance;
      luminanceSquaredSum += luminance * luminance;
      if (chroma < 32) neutralPixels += 1;
      if (luminance > 155 && chroma < 38) paperLikePixels += 1;
      if (luminance < 125 && chroma < 42) inkLikePixels += 1;
    }

    const mean = luminanceSum / pixelCount;
    const variance = Math.max(
      0,
      luminanceSquaredSum / pixelCount - mean * mean,
    );
    const standardDeviation = Math.sqrt(variance);

    if (mean < 48) return { accepted: false, issue: "tooDark" };
    if (mean > 246 && standardDeviation < 18) {
      return { accepted: false, issue: "tooBright" };
    }
    if (standardDeviation < 14) {
      return { accepted: false, issue: "lowContrast" };
    }

    const { edgeRatio, laplacianVariance } = calculateSharpness(
      grayscale,
      canvas.width,
      canvas.height,
    );
    if (laplacianVariance < 36) {
      return { accepted: false, issue: "blurry" };
    }

    const neutralRatio = neutralPixels / pixelCount;
    const paperLikeRatio = paperLikePixels / pixelCount;
    const inkLikeRatio = inkLikePixels / pixelCount;
    const lacksDocumentSurface = paperLikeRatio < 0.24 && neutralRatio < 0.52;
    const lacksReadableStructure = edgeRatio < 0.012 || inkLikeRatio < 0.003;

    if (lacksDocumentSurface || lacksReadableStructure) {
      return { accepted: false, issue: "notDocument" };
    }

    return { accepted: true };
  } finally {
    bitmap.close();
  }
}

function calculateSharpness(
  grayscale: Float32Array,
  width: number,
  height: number,
) {
  let edgePixels = 0;
  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let measuredPixels = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const horizontal = Math.abs(grayscale[index + 1] - grayscale[index - 1]);
      const vertical = Math.abs(
        grayscale[index + width] - grayscale[index - width],
      );
      if (horizontal + vertical > 44) edgePixels += 1;

      const laplacian =
        4 * grayscale[index] -
        grayscale[index - 1] -
        grayscale[index + 1] -
        grayscale[index - width] -
        grayscale[index + width];
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian * laplacian;
      measuredPixels += 1;
    }
  }

  if (!measuredPixels) return { edgeRatio: 0, laplacianVariance: 0 };
  const laplacianMean = laplacianSum / measuredPixels;
  return {
    edgeRatio: edgePixels / measuredPixels,
    laplacianVariance: Math.max(
      0,
      laplacianSquaredSum / measuredPixels - laplacianMean * laplacianMean,
    ),
  };
}
