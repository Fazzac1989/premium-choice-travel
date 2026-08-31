import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Presence-only health flags — never exposes any secret values. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    shutterstock: Boolean(process.env.SHUTTERSTOCK_API_TOKEN),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    liteapi: Boolean(process.env.LITEAPI_KEY),
    pcstSiteUrl: Boolean(process.env.PCST_SITE_URL),
    pcstRevalidateSecret: Boolean(process.env.PCST_REVALIDATE_SECRET),
    ratesPreviewKey: Boolean(process.env.RATES_PREVIEW_KEY),
    ratesPublic: process.env.RATES_PUBLIC === '1',
    version: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : 'dev',
  });
}
