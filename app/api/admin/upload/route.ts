import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

// Vercel rejects a serverless request body over 4.5MB before this handler is
// reached, so anything larger can never be answered politely here. Staying
// under that keeps the error a readable JSON message rather than a raw 413.
// The admin form also resizes images in the browser, so real uploads land far
// below this.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not authorised' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: 'No file received' }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ ok: false, error: 'Only JPG, PNG, WebP, AVIF or GIF images' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Image is too large even after resizing — save it at a smaller size first' },
      { status: 400 }
    );
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  const db = createAdminClient();
  const { error } = await db.storage.from('images').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    console.error('[upload]', error.message);
    return NextResponse.json({ ok: false, error: 'Upload failed — try again' }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = db.storage.from('images').getPublicUrl(path);

  return NextResponse.json({ ok: true, url: publicUrl });
}
