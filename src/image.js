// Purpose: Prepare uploaded/captured image files for local storage.
// Contract: Returns a JPEG Blob that prioritizes readability over tiny size.
// Why: iPhone photos may be HEIC/HEIF and need conversion before canvas work.
// Verify: Use one HEIC and one JPEG sample; both should render in preview/detail.

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSIONS = [".heic", ".heif"];

function isHeicFile(file) {
  const lower = file.name.toLowerCase();
  return HEIC_TYPES.has(file.type) || HEIC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function ensureBrowserImageFile(file) {
  if (!isHeicFile(file)) {
    return file;
  }

  // Lazy-load only for HEIC/HEIF uploads to keep normal path lightweight.
  const module = await import("https://esm.sh/heic2any@0.0.4");
  const converted = await module.default({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
  return new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
    type: "image/jpeg",
  });
}

function scaleDimensions(width, height, maxWidth) {
  if (width <= maxWidth) {
    return { width, height };
  }
  const ratio = maxWidth / width;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

async function drawToJpegBlob(file, options) {
  const bitmap = await createImageBitmap(file);
  const dimensions = scaleDimensions(bitmap.width, bitmap.height, options.maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/jpeg", options.quality);
  });

  bitmap.close();
  if (!blob) {
    throw new Error("Image compression failed");
  }
  return blob;
}

export async function processImageForStorage(inputFile) {
  const normalizedFile = await ensureBrowserImageFile(inputFile);
  const shouldCompress = normalizedFile.size > 1.5 * 1024 * 1024;
  const options = shouldCompress
    ? { maxWidth: 2200, quality: 0.85 }
    : { maxWidth: 2200, quality: 0.92 };

  const blob = await drawToJpegBlob(normalizedFile, options);
  return {
    blob,
    mimeType: "image/jpeg",
    previewUrl: URL.createObjectURL(blob),
  };
}
