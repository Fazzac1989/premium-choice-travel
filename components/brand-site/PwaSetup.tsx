'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pcs.install-dismissed';
const DISMISS_DAYS = 14;

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed() {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Makes the Staycations site installable: registers the service worker on
 * the brand's own domain and offers "add to home screen" once, politely.
 * Android/desktop Chrome get a real install button; iOS gets the two taps
 * Safari requires, since it never fires the install event.
 */
export default function PwaSetup({ base }: { base: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden');

  useEffect(() => {
    // The worker's scope is the whole origin, so it only belongs on the
    // brand's own domain — never on the master site's /sites preview.
    if (base === '' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [base]);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setMode('prompt');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (ios && safari) timer = setTimeout(() => setMode((m) => (m === 'hidden' ? 'ios' : m)), 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Fine — it just shows again next visit.
    }
    setMode('hidden');
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setMode('hidden');
    else dismiss();
  };

  if (mode === 'hidden') return null;

  return (
    <div
      role="dialog"
      aria-label="Add Staycations to your home screen"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-line bg-white p-4 shadow-2xl shadow-ink/20"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-start gap-3">
        <Image src="/images/pwa/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-tight text-ink">Get the Staycations app</p>
          {mode === 'ios' ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Tap <span className="font-semibold text-ink">Share</span>, then{' '}
              <span className="font-semibold text-ink">Add to Home Screen</span> — hotels, your
              shortlist and your enquiries in one tap.
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Add it to your home screen — hotels, your shortlist and your enquiries in one tap.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {mode === 'prompt' && (
              <button type="button" onClick={install} className="btn-primary !px-4 !py-2">
                Install
              </button>
            )}
            <button type="button" onClick={dismiss} className="btn-outline !px-4 !py-2">
              {mode === 'ios' ? 'Got it' : 'Not now'}
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Close" className="-mr-1 -mt-1 p-1 text-ink-soft hover:text-ink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
