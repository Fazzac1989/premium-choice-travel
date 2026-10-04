# Walking an enquiry through, without writing to a customer

The enquiry flow ends in three emails and a database row. There is no way to
exercise it without the real Supabase project, so the way to test it safely is
to control where the email lands rather than to fake the sending.

## The two switches

**`EMAIL_REDIRECT_TO`** sends every email *this app* produces to one address
instead of the person it was addressed to. The subject becomes
`[TEST → guest@example.com] …`, the body gains a yellow banner saying so, and
each redirect is logged with a warning. Set it in `.env.local` for a local run,
or on a preview deployment.

**A test address you actually own.** Gmail plus-addressing is enough:
`chris.farrell2602+pct-test@gmail.com` is a different address to every system
that reads it, and lands in your normal inbox. Use it as the customer's email
in the enquiry form.

## Why you need both

`EMAIL_REDIRECT_TO` catches the staff notification and the customer
confirmation, because this app sends those. It does **not** catch the sign-in
link — Supabase sends that one directly, and nothing in this codebase is between
Supabase and the mail. So the address typed into the form has to be a real
mailbox you can open, or the link goes nowhere you can reach.

## The run

1. Put both in place:

   ```
   EMAIL_REDIRECT_TO=chris.farrell2602@gmail.com
   ```

2. Open `/enquire` on the Holidays site, fill it in with
   `chris.farrell2602+pct-test@gmail.com`, leave the account tick box ticked,
   and send it.

3. Expect three emails:
   - the staff notification, subject prefixed `[TEST → …]`
   - the customer confirmation, also prefixed
   - the Supabase sign-in link, **not** prefixed, because Supabase sent it

4. Click the sign-in link. It should land on **My booking** with the enquiry you
   just sent already listed — `/auth/callback` claims past activity by email, so
   the enquiry attaches to the new account on first sign-in.

5. Afterwards: the enquiry is a real row. Find it in the admin by the
   `+pct-test` address. Leave it or remove it, but know it is there — it will
   otherwise look like a live enquiry nobody answered.

## The one thing to be careful about

Never leave `EMAIL_REDIRECT_TO` set on the production deployment. Every
customer email would quietly go to one inbox, the site would look completely
normal, and the first sign of trouble would be a customer saying they never
heard back. The warning in the logs is the only outward sign.

If you want this on permanently somewhere, put it on a preview deployment
rather than production.
