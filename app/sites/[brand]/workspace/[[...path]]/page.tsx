import { notFound, redirect } from 'next/navigation';
import Shell, { DEMO_ROLES } from '@/components/corporate/workspace/Shell';
import { Approvals, Finance, Overview, RequestTrip, Spend, Team, TripDetail, Trips } from '@/components/corporate/workspace/views';
import { WORKSPACE_NAV, type Ctx } from '@/components/corporate/workspace/parts';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { CORPORATE_APP_URL } from '@/lib/corporate/content';
import { DEMO_MEMBER_IDS, demoSnapshot } from '@/lib/corporate/workspace/demo';
import { hasRole } from '@/lib/corporate/workspace/rules';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Client workspace demo', robots: { index: false, follow: false } };

/**
 * The client workspace's labelled demo, on premiumchoicecorporate.com:
 *
 *   /workspace/demo/<role>/…   a fictional company, seen as finance, approver, arranger or traveller
 *
 * The real workspace — live search, booking on the spot, approvals — is Premium Choice Corporate on
 * the trade platform (founder, 2026-10-04), at app.premiumchoicecorporate.com. Every other
 * /workspace address goes there.
 */
export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: { brand: string; path?: string[] };
  searchParams: Record<string, string | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.key !== 'corporate') notFound();
  const root = `${brandBase(brand)}/workspace`;
  const path = params.path ?? [];
  if (path[0] !== 'demo') redirect(path[0] === 'sign-in' ? `${CORPORATE_APP_URL}/login` : CORPORATE_APP_URL);

  const role = DEMO_ROLES.find((r) => r.key === path[1])?.key;
  if (!role) redirect(`${root}/demo/finance`);
  const now = new Date();
  const s = demoSnapshot(now);
  const me = s.members.find((m) => m.id === DEMO_MEMBER_IDS[role])!;
  const c: Ctx = { s, me, base: `${root}/demo/${role}`, demo: true, now, exportHref: `${root}/export?demo=1`, search: searchParams };
  return render(c, path.slice(2), { demoRole: role, demoRoot: `${root}/demo` });
}

function render(c: Ctx, rest: string[], demo: { demoRole: string; demoRoot: string }) {
  const [section, id] = rest;
  const current = section ? `/${section}${id ? `/${id}` : ''}` : '';
  const allowed = (href: string) => WORKSPACE_NAV.find((n) => n.href === href)?.show(c.me) ?? false;

  let body: React.ReactNode;
  if (!section) body = <Overview {...c} />;
  else if (section === 'trips' && id) body = <TripDetail {...c} tripRef={decodeURIComponent(id)} />;
  else if (section === 'trips') body = <Trips {...c} />;
  else if (section === 'request' && (hasRole(c.me, 'traveller') || hasRole(c.me, 'arranger'))) body = <RequestTrip {...c} />;
  else if (section === 'approvals' && allowed('/approvals')) body = <Approvals {...c} />;
  else if (section === 'spend' && allowed('/spend')) body = <Spend {...c} />;
  else if (section === 'finance' && allowed('/finance')) body = <Finance {...c} />;
  else if (section === 'team' && allowed('/team')) body = <Team {...c} />;
  // A screen this role may not open looks the same as one that does not exist.
  else notFound();

  return (
    <Shell c={c} current={current} demoRole={demo.demoRole} demoRoot={demo.demoRoot}>
      {body}
    </Shell>
  );
}
