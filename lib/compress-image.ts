/**
 * Shrink a photo in the browser before it is sent.
 *
 * Vercel rejects any serverless request body over 4.5MB, and a phone photo is
 * routinely larger than that. Resizing here keeps uploads well under the limit
 * and gives the sites web-sized images rather than 12-megapixel originals.
 *
 * Returns the original file untouched when there is nothing to gain, or when
 * the browser cannot decode it — the server still has the final say on size.
 */
export async function compressImage(file: File, maxEdge = 2000, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  // Already small enough, and not a heavyweight file worth re-encoding.
  if (scale === 1 && file.size <= 3 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!blob || blob.size >= file.size) return file; // no gain, keep the original

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

/**
 * POST a file to an upload endpoint and read the URL back.
 *
 * A rejected upload comes back as plain text, not JSON, so the body is read as
 * text first — otherwise a size rejection surfaces as a parser error instead of
 * a sentence the user can act on.
 */
export async function uploadTo(endpoint: string, file: File): Promise<string> {
  const prepared = await compressImage(file);

  const fd = new FormData();
  fd.append('file', prepared);
  const res = await fetch(endpoint, { method: 'POST', body: fd });

  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    if (res.status === 413) {
      throw new Error(
        `“${file.name}” is too large to upload even after resizing. Save it at a smaller size and try again.`
      );
    }
    throw new Error(`Upload failed (${res.status}). ${raw.slice(0, 120)}`);
  }

  if (!json.ok) throw new Error(json.error || 'Upload failed');
  return json.url as string;
}
