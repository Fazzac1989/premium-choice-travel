export default function SectionHeading({
  eyebrow,
  title,
  text,
  center = false,
  light = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  center?: boolean;
  light?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <p className={`eyebrow ${light ? '!text-teal' : ''}`}>{eyebrow}</p>
      <h2 className={`mt-2 font-serif text-3xl leading-tight sm:text-4xl ${light ? 'text-white' : 'text-ink'}`}>
        {title}
      </h2>
      {text && (
        <p className={`mt-4 text-base leading-relaxed ${light ? 'text-white/70' : 'text-ink-soft'}`}>{text}</p>
      )}
    </div>
  );
}
