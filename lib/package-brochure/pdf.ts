import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Render a brochure to PDF by printing the page itself.
 *
 * The PDF is the print stylesheet rendered in headless Chromium, not a second
 * document built from the same data. That is the whole point: a separately
 * authored PDF drifts from the web page within a release or two, and nobody
 * notices until a customer is holding the wrong price.
 *
 * Ported from the School Trips renderer, including the guards — each one is
 * there because of something that actually went wrong. This is the second PDF
 * path in this repository: quotes and trip pages use @react-pdf/renderer,
 * which builds a document tree. That suits a fixed layout; it cannot render an
 * existing stylesheet, which is what a brochure needs.
 */

const BUCKET = 'brochure-pdfs';

/** Chromium ships as a binary; only load it where it is actually used. */
async function launch() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const puppeteer = await import('puppeteer-core');

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Locally, use whatever Chrome is installed rather than shipping a second one.
  const executablePath =
    process.env.CHROME_PATH ||
    (process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome');

  return puppeteer.launch({ executablePath, headless: true });
}

export type PdfResult = { ok: true; path: string; bytes: number } | { ok: false; error: string };

/**
 * Move this date forward whenever the printed design changes.
 *
 * A brochure is read far more often than it is edited, and each render costs a
 * browser launch, so the stored file is reused until `updated_at` moves past
 * `pdf_generated_at`. But a deploy that changes how the deck looks edits no
 * brochure, and every stored PDF would keep serving the old design.
 */
export const DESIGN_CHANGED_AT = '2026-09-22T00:00:00Z';

export function isStale(brochure: {
  updated_at?: string | null;
  pdf_generated_at?: string | null;
  pdf_storage_path?: string | null;
}) {
  if (!brochure.pdf_storage_path || !brochure.pdf_generated_at) return true;
  const generated = new Date(brochure.pdf_generated_at).getTime();
  if (generated < new Date(DESIGN_CHANGED_AT).getTime()) return true;
  if (!brochure.updated_at) return false;
  return new Date(brochure.updated_at).getTime() > generated;
}

export async function renderPdf(id: number, pageUrl: string): Promise<PdfResult> {
  const db = createAdminClient();
  let browser: Awaited<ReturnType<typeof launch>> | null = null;

  try {
    browser = await launch();
    const page = await browser.newPage();

    // A4 at 96dpi, so the print stylesheet's desktop breakpoints apply rather
    // than the mobile ones a narrow viewport would trigger.
    await page.setViewport({ width: 1123, height: 1587, deviceScaleFactor: 2 });
    await page.emulateMediaType('print');
    const response = await page.goto(pageUrl, { waitUntil: 'load', timeout: 45_000 });

    // Chromium will render anything, including a 404, and we would then store
    // it and serve it as the document until the row changes. On School Trips a
    // transient failure during a deploy did exactly that: a brochure's stored
    // PDF became one page reading "This page could not be found."
    if (response && !response.ok()) {
      return { ok: false, error: `The page returned HTTP ${response.status()} — nothing was stored.` };
    }
    const rendered = await page.evaluate(() => document.querySelectorAll('.sl-page').length);
    if (rendered === 0) {
      return {
        ok: false,
        error: 'The page rendered no slides — it was probably an error page, so nothing was stored.',
      };
    }

    // Photographs are marked loading="lazy", and a headless render never
    // scrolls, so below-the-fold images would stay unloaded — missing from the
    // PDF, and never resolving a wait on them. Make every image eager first.
    await page.evaluate(() => {
      document.querySelectorAll('img').forEach((img) => {
        img.loading = 'eager';
        // Reassigning src restarts a load the lazy loader had deferred.
        if (!img.complete) img.src = img.src;
      });
    });

    // Fonts and images have to be in before the snapshot, but a single stalled
    // asset must not hold the whole render open.
    await page.evaluate(async () => {
      const settle = (p: Promise<unknown>) =>
        Promise.race([p, new Promise((r) => setTimeout(r, 10_000))]);
      await settle((document as any).fonts?.ready ?? Promise.resolve());
      await settle(
        Promise.all(
          Array.from(document.images)
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((res) => {
                  img.addEventListener('load', res, { once: true });
                  img.addEventListener('error', res, { once: true });
                }),
            ),
        ),
      );
    });

    const buffer = await page.pdf({
      // page.pdf() allows itself thirty seconds by default, which a
      // thirty-six-package brochure does not fit into: the golf collection is
      // 148 sheets of photography and took longer than that on the first run.
      timeout: 120_000,
      // Size, orientation and margin all come from the stylesheet's @page
      // rule, so page geometry lives in one place. The margin there is zero:
      // the cover's colour runs to the edge of the paper the way a printed
      // cover does, and the inset comes from each slide's own padding.
      preferCSSPageSize: true,
      printBackground: true,
      // No Chromium header or footer: both are drawn in the page margin, and
      // there is none. The running footer is part of the slide instead.
      displayHeaderFooter: false,
    });

    const path = `brochures/${id}/${Date.now()}.pdf`;
    const { error } = await db.storage.from(BUCKET).upload(path, Buffer.from(buffer), {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) {
      // Say how big it was: "exceeded the maximum allowed size" on its own
      // leaves you guessing whether you are over by a megabyte or by fifty.
      const mb = (buffer.length / 1048576).toFixed(1);
      return { ok: false, error: `storage: ${error.message} (the file was ${mb}MB)` };
    }

    await db
      .from('package_brochures')
      .update({ pdf_storage_path: path, pdf_generated_at: new Date().toISOString() })
      .eq('id', id);

    return { ok: true, path, bytes: buffer.length };
  } catch (e: any) {
    console.error('[package-brochure-pdf]', e?.message);
    return { ok: false, error: e?.message ?? 'render failed' };
  } finally {
    await browser?.close();
  }
}

/** A short-lived link to the stored file; the bucket itself is private. */
export async function signedPdfUrl(path: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
