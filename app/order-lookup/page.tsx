import Link from "next/link";

import NavBar from "@/components/NavBar";
import OrderLookupClient from "@/components/orders/OrderLookupClient";

type SearchParams = Record<string, string | string[] | undefined>;

function extractParam (value?: string | string[]): string
{
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export default async function OrderLookupPage ({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
})
{
  const resolvedParams = searchParams ? await searchParams : undefined;
  const orderNumber = extractParam(resolvedParams?.orderNumber);
  const email = extractParam(resolvedParams?.email);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-8 sm:p-12 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
            <div className="mb-8 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-purple-200">
                Self-Service Support
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Find Your Order
              </h1>
              <p className="mt-3 text-sm text-zinc-400">
                Enter the order number from your receipt email. We&apos;ll
                surface shipping details instantly—no account required.
              </p>
            </div>

            <OrderLookupClient
              defaultOrderNumber={orderNumber}
              defaultEmail={email}
            />
            <div className="mt-8 flex justify-center">
              <Link
                href="/"
                className="rounded-full border border-purple-500/60 bg-purple-500/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

