/**
 * Ask for each image at the size it will actually be shown.
 *
 * A brochure PDF embeds every picture at whatever resolution the file happens
 * to be, and Chromium re-encodes rather than carrying the JPEG through, so the
 * file size follows pixel count almost exactly. The golf collection's first
 * render was 356MB — thirty-six packages at three photographs each, every one
 * a full-width original. Storage refused it, and no-one could have emailed it
 * if it had not.
 *
 * Two sources need handling. Supabase Storage serves resized copies from a
 * `render/image` path; Unsplash takes its own width, height and crop
 * parameters. Anything else is returned untouched, because a broken picture is
 * worse than a heavy one.
 */

const PUBLIC_OBJECT = '/storage/v1/object/public/';
const RENDER_IMAGE = '/storage/v1/render/image/public/';

export type ImageRole = 'cover' | 'hero' | 'thumb' | 'micro';

/**
 * The box each role fills on an A4 page, doubled for a 2x render.
 *
 * A width on its own is not enough: a tall photograph comes back as tall as it
 * likes, and contents thumbnails 15mm across arrive 1450px deep. Every one of
 * these images is displayed cropped to a fixed box, so cropping here shows
 * exactly what the page already showed.
 */
const BOXES: Record<ImageRole, { width: number; height: number }> = {
  /** The full-bleed cover, 16:9. */
  cover: { width: 1000, height: 580 },
  /** A package's main picture, 16:9. */
  hero: { width: 620, height: 350 },
  /** The two smaller shots beneath it, 4:3. */
  thumb: { width: 400, height: 300 },
  /** A contents-page thumbnail, roughly 15mm across. */
  micro: { width: 220, height: 150 },
};

const QUALITY = 72;

export function sizedImage(url: string | null | undefined, role: ImageRole): string | null {
  if (!url) return null;
  const { width, height } = BOXES[role];

  // Unsplash: its own parameters, replacing whatever the record carries.
  if (/(^|\.)images\.unsplash\.com\//.test(url) || url.includes('images.unsplash.com/')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('h', String(height));
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('q', String(QUALITY));
      u.searchParams.set('auto', 'format');
      return u.toString();
    } catch {
      return url;
    }
  }

  // Our own storage: the render endpoint.
  if (url.includes(PUBLIC_OBJECT)) {
    if (url.includes(RENDER_IMAGE) || url.includes('?')) return url;
    const base = url.replace(PUBLIC_OBJECT, RENDER_IMAGE);
    return `${base}?width=${width}&height=${height}&resize=cover&quality=${QUALITY}`;
  }

  return url;
}
