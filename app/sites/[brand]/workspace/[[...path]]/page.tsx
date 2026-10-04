import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import SignInForm from '@/components/SignInForm';
import Shell, { DEMO_ROLES } from '@/components/corporate/workspace/Shell';
import { Approvals, Finance, Overview, RequestTrip, Spend, Team, TripDetail, Trips } from '@/components/corporate/workspace/views';
import { WORKSPACE_NAV, type Ctx } from '@/components/corporate/workspace/parts';
import { getAccount } from '@/lib/account';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { DEMO_MEMBER_IDS, demoSnapshot } from '@/lib/corporate/workspace/demo';
import { getMembership, loadSnapshot, WorkspaceNotReady } from '@/lib/corporate/workspace/repo';
import { hasRole } from '@/lib/corporate/workspace/rules';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Client workspace', robots: { index: false, follow: false } };

/**
 * The Premium Choice Corporate client workspace, on premiumchoicecorporate.com.
 *
 *   /workspace/…                  the signed-in client's own programme
 *   /workspace/demo/<role>/…      the fictional demo company, seen as a role
 *   /workspace/sign-in            sign in by emailed link
 *
 * The same screens render both; only where the data comes from differs.
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
  const now = new Date();

  if (path[0] === 'sign-in') return <SignIn root={root} />;

  // ── Demo ──────────────────────────────────────────────
  if (path[0] === 'demo') {
    const role = DEMO_ROLES.find((r) => r.key === path[1])?.key;
    if (!role) redirect(`${root}/demo/finance`);
    const s = demoSnapshot(now);
    const me = s.members.find((m) => m.id === DEMO_MEMBER_IDS[role])!;
    const c: Ctx = { s, me, base: `${root}/demo/${role}`, demo: true, now, exportHref: `${root}/export?demo=1`, search: searchParams };
    return render(c, path.slice(2), { demoRole: role, demoRoot: `${root}/demo` });
  }

  // ── Live ──────────────────────────────────────────────
  const account = await getAccount();
  if (!account) redirect(`${root}/sign-in`);

  let membership;
  try {
    membership = await getMembership(account);
  } catch (e) {
    if (e instanceof WorkspaceNotReady) return <Notice title="The workspace is being set up" root={root} text="Your account team is getting your programme ready. Have a look at the demo in the meantime." />;
    throw e;
  }
  if (!membership)
    return (
      <Notice
        title="No programme on this account yet"
        root={root}
        text={`You are signed in as ${account.email}, but this address is not part of a Premium Choice Corporate programme. If your company works with us, ask your account manager to add you; if not, book a free travel programme review.`}
      />
    );

  const s = await loadSnapshot(membership.companyId);
  const me = s.members.find((m) => m.id === membership.member.id)!;
  const c: Ctx = { s, me, base: root, demo: false, now, exportHref: `${root}/export`, search: searchParams };
  return render(c, path);
}

function render(c: Ctx, rest: string[], demo?: { demoRole: string; demoRoot: string }) {
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
    <Shell c={c} current={current} demoRole={demo?.demoRole} demoRoot={demo?.demoRoot}>
      {body}
    </Shell>
  );
}

async function SignIn({ root }: { root: string }) {
  if (await getAccount()) redirect(root);
  return (
    <main className="bg-sand">
      <div className="container-site grid max-w-5xl gap-10 py-14 sm:py-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Client workspace</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">Sign in</h1>
          <p className="mt-3 text-ink-soft">
            Your trips, approvals, spend and invoices in one place. Enter your work email and we will send you a
            sign-in link — no password to remember.
          </p>
          <p className="mt-6 text-sm text-ink-soft">
            Not a client yet?{' '}
            <Link href={`${root}/demo/finance`} className="font-semibold text-teal-deep hover:underline">See the demo workspace</Link>
            {' '}or{' '}
            <Link href={root.replace(/\/workspace$/, '/programme-review')} className="font-semibold text-teal-deep hover:underline">book a free programme review</Link>.
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <SignInForm next={root} />
        </div>
      </div>
    </main>
  );
}

function Notice({ title, text, root }: { title: string; text: string; root: string }) {
  return (
    <main className="bg-sand">
      <div className="container-site max-w-2xl py-16">
        <p className="eyebrow">Client workspace</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">{title}</h1>
        <p className="mt-4 text-ink-soft">{text}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`${root}/demo/finance`} className="btn-primary !px-5 !py-2.5">See the demo</Link>
          <Link href={root.replace(/\/workspace$/, '/programme-review')} className="btn-outline !px-5 !py-2.5">Book a free review</Link>
        </div>
      </div>
    </main>
  );
}
