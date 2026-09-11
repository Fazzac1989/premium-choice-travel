'use client';

import { useState } from 'react';

/** A copy-to-clipboard button. The default look is an outline button; pass a
 *  className to drop it into a line of text instead. */
export default function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className ?? 'btn-outline !px-4 !py-2 text-xs'}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? 'Copied ✓' : 'Copy link'}
    </button>
  );
}
