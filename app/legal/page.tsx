import Link from "next/link";
import { NavBar } from "@ap/shared-ui";

const policyLinks = [
  {
    href: "/legal/terms-of-use",
    title: "Terms of Use",
    description: "Rules for using this site, placing orders, and account behavior.",
  },
  {
    href: "/legal/privacy-policy",
    title: "Privacy Policy",
    description: "How customer data is collected, used, and protected.",
  },
  {
    href: "/legal/shipping-policy",
    title: "Shipping Policy",
    description: "Processing timelines, shipping methods, and delivery guidance.",
  },
  {
    href: "/legal/refund-policy",
    title: "Refund & Returns Policy",
    description: "Eligibility, exceptions, and the refund review process.",
  },
  {
    href: "/legal/research-use-only",
    title: "Research Use Only Disclaimer",
    description: "Product-use restrictions and compliance requirements.",
  },
];

export default function LegalHubPage ()
{
  return (
    <div className="theme-page min-h-screen">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="theme-card-gradient rounded-3xl p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-200">
              Legal Center
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Compliance Policies
            </h1>
            <p className="mt-4 text-sm text-zinc-300 sm:text-base">
              These documents outline our website terms, privacy commitments,
              research-use restrictions, and order policies. Review them before
              placing an order.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {policyLinks.map((policy) => (
              <Link
                key={policy.href}
                href={policy.href}
                className="theme-surface rounded-2xl p-6 transition hover:border-purple-500/60"
              >
                <h2 className="text-lg font-semibold text-white">{policy.title}</h2>
                <p className="mt-2 text-sm text-zinc-300">{policy.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
