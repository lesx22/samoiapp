// ─── Image shrinking ──────────────────────────────────────────────────────────
// Phone photos are often 3-8 MB, over Vercel's 4.5 MB request limit once
// base64-encoded. Claude doesn't use detail beyond ~1568px on the long edge,
// so we downscale to that and re-encode as JPEG before sending.

const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.85;

export function fitWithin(width, height, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Returns { b64, mime } ready for a Claude image block
export async function shrinkImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browser can't decode it (e.g. HEIC in Chrome): send the original
    return { b64: await blobToBase64(file), mime: file.type };
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  return { b64: await blobToBase64(blob), mime: "image/jpeg" };
}
