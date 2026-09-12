import SiteFooter from '@/components/SiteFooter';

/**
 * The master site, in Coastal Calm.
 *
 * The class is the whole of it: the palette tokens are restated inside
 * `.coastal` in globals.css, so every `text-teal` and `bg-sand` already in
 * this site's markup resolves to the new colours. The words do not change.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coastal">
      {children}
      <SiteFooter />
    </div>
  );
}
