/**
 * A WhatsApp chat button, prefilled with what the visitor is looking at.
 *
 * Shown only once NEXT_PUBLIC_WHATSAPP_NUMBER holds the business's confirmed
 * WhatsApp number (international digits, e.g. 9715XXXXXXXX). The office
 * landline is deliberately not assumed to take WhatsApp — with no number set
 * this renders nothing.
 */
export function whatsAppNumber(): string | null {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

export default function WhatsAppLink({
  text,
  label = 'Message us on WhatsApp',
  className = '',
  variant = 'outline',
}: {
  text: string;
  label?: string;
  className?: string;
  variant?: 'outline' | 'solid';
}) {
  const number = whatsAppNumber();
  if (!number) return null;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`${variant === 'solid' ? 'btn-primary' : 'btn-outline'} w-full gap-2 ${className}`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z" />
      </svg>
      {label}
    </a>
  );
}
