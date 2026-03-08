import Link from "next/link";

import { NavBar, OrderLookupClient } from "@ap/shared-ui";

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

  return (
    <div className="theme-page min-h-screen">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card-gradient rounded-3xl p-8 sm:p-12">
            <div className="mb-8 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-purple-200">
                Self-Service Support
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Find Your Order
              </h1>
              <p className="mt-3 text-sm text-zinc-400">
                Enter the order number and the same email used at checkout to
                view current order status.
              </p>
            </div>

            <OrderLookupClient defaultOrderNumber={orderNumber} />
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

