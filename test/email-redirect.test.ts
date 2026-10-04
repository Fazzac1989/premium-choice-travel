import { afterEach, describe, expect, it } from 'vitest';
import { redirectedRecipients } from '@/lib/email-core';

const set = (v: string | undefined) => {
  if (v === undefined) delete process.env.EMAIL_REDIRECT_TO;
  else process.env.EMAIL_REDIRECT_TO = v;
};

afterEach(() => set(undefined));

describe('where an email actually goes', () => {
  it('goes to the addressee when the switch is off', () => {
    set(undefined);
    expect(redirectedRecipients(['guest@example.com'])).toEqual({
      to: ['guest@example.com'],
      intercepted: null,
    });
  });

  it('treats an empty or blank switch as off, so a stray env line cannot swallow mail', () => {
    set('');
    expect(redirectedRecipients(['guest@example.com']).intercepted).toBeNull();
    set('   ');
    expect(redirectedRecipients(['guest@example.com']).intercepted).toBeNull();
  });

  it('sends everything to the one inbox when the switch is on', () => {
    set('founder@premiumchoicetravel.com');
    expect(redirectedRecipients(['guest@example.com'])).toEqual({
      to: ['founder@premiumchoicetravel.com'],
      intercepted: ['guest@example.com'],
    });
  });

  it('collapses several addressees into one delivery, and remembers them all', () => {
    set('founder@premiumchoicetravel.com');
    const out = redirectedRecipients(['a@example.com', 'b@example.com']);
    expect(out.to).toEqual(['founder@premiumchoicetravel.com']);
    expect(out.intercepted).toEqual(['a@example.com', 'b@example.com']);
  });

  it('ignores whitespace around the address', () => {
    set('  founder@premiumchoicetravel.com  ');
    expect(redirectedRecipients(['guest@example.com']).to).toEqual([
      'founder@premiumchoicetravel.com',
    ]);
  });
});

describe('what actually goes to the mailer', () => {
  const callMailer = async () => {
    const calls: any[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: any, init: any) => {
      calls.push(JSON.parse(init.body));
      return { ok: true, text: async () => '' } as any;
    }) as any;
    const { sendEmail } = await import('@/lib/email-core');
    process.env.RESEND_API_KEY = 'test-key';
    await sendEmail({
      to: 'guest@example.com',
      subject: 'Thank you for getting in touch',
      html: '<p>Your enquiry</p>',
    });
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY;
    return calls[0];
  };

  it('rewrites the recipient, the subject and the body when the switch is on', async () => {
    set('founder@premiumchoicetravel.com');
    const sent = await callMailer();
    expect(sent.to).toEqual(['founder@premiumchoicetravel.com']);
    expect(sent.subject).toBe('[TEST → guest@example.com] Thank you for getting in touch');
    // The banner names who it was for, and the original body survives beneath it.
    expect(sent.html).toContain('guest@example.com');
    expect(sent.html).toContain('was not sent to them');
    expect(sent.html).toContain('<p>Your enquiry</p>');
  });

  it('leaves everything alone when the switch is off', async () => {
    set(undefined);
    const sent = await callMailer();
    expect(sent.to).toEqual(['guest@example.com']);
    expect(sent.subject).toBe('Thank you for getting in touch');
    expect(sent.html).toBe('<p>Your enquiry</p>');
  });
});
