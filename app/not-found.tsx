import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black px-6 py-16 text-zinc-100 sm:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-10 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
          404
        </p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
          Page not found
        </h1>
        <p className="text-sm text-zinc-300 sm:text-base">
          The page you’re looking for doesn’t exist (or it may have moved).
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/"
            className="rounded-full bg-purple-600 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-purple-500"
          >
            Go Home
          </Link>
          <Link
            href="/store"
            className="rounded-full border border-purple-500/60 bg-purple-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-100 transition hover:border-purple-300 hover:text-white"
          >
            Visit Store
          </Link>
        </div>
      </div>
    </div>
  );
}






