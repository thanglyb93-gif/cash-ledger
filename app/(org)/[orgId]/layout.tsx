import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserOrgs } from "@/lib/orgs";
import { OrgSwitcher } from "@/components/ui/OrgSwitcher";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const orgs = await getUserOrgs();
  const current = orgs.find((o) => o.org_id === orgId);

  if (!current) {
    notFound();
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={`/${orgId}/${href}`}
      className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            {orgs.length > 1 ? (
              <OrgSwitcher orgs={orgs} currentOrgId={orgId} />
            ) : (
              <span className="text-sm font-semibold text-zinc-900">{current.org.name}</span>
            )}
          </div>
          <nav className="flex items-center gap-1">
            {navLink("transactions", "Transactions")}
            {navLink("receipts", "Receipts")}
            {navLink("accounts", "Accounts")}
            {navLink("reports/monthly", "Monthly report")}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
