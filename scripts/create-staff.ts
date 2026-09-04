/**
 * Create a staff (admin) login — for a colleague, or for Hotelbeds'
 * certification reviewers, so nobody has to share their own password.
 *
 * Creates the Supabase Auth user (email confirmed) and sets the profile
 * role to admin, which is what /admin checks.
 *
 * Usage:
 *   npx tsx scripts/create-staff.ts reviewer@example.com 'a-strong-password'
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npx tsx scripts/create-staff.ts <email> <password>');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use a password of at least 10 characters.');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(listError.message);
  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    const { error } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw new Error(error.message);
    console.log(`✓ ${email} already existed — password updated`);
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
    user = data.user!;
    console.log(`✓ Created ${email}`);
  }
  const { error: profileError } = await db
    .from('profiles')
    .upsert({ id: user.id, email, role: 'admin' }, { onConflict: 'id' });
  if (profileError) throw new Error(`profile: ${profileError.message}`);
  console.log('✓ Role set to admin — they can sign in at /admin/login');
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
