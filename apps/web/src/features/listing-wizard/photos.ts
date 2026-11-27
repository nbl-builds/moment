import { LISTING_PHOTO_MAX_EDGE } from "@moment/shared";

export const ACCEPTED_PHOTOS = "image/jpeg,image/png,image/webp";

/**
 * Resizes a photo in the browser so the longest edge is at most
 * LISTING_PHOTO_MAX_EDGE and re-encodes it as WebP (JPEG where WebP encoding
 * isn't supported). Keeps uploads small on Pakistani mobile data.
 */
export async function resizePhoto(file: File): Promise<{ body: Blob; contentType: string; extension: string }> {
  if (!ACCEPTED_PHOTOS.split(",").includes(file.type)) throw new Error(`${file.name}: use a JPG, PNG or WebP photo.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LISTING_PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser can't prepare photos for upload.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  if (webp && webp.type === "image/webp") return { body: webp, contentType: "image/webp", extension: "webp" };
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error(`${file.name}: couldn't read this photo.`);
  return { body: jpeg, contentType: "image/jpeg", extension: "jpg" };
}
