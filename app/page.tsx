import Image from "next/image";

import NavBar from "@/components/NavBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="space-y-24 pb-24">
        <section className="relative isolate overflow-hidden px-6 pt-28 pb-32 sm:px-12 lg:px-16">
          <div
            className="absolute inset-0 bg-gradient-to-b from-black via-[#140018] to-black"
            aria-hidden
          />
          <div
            className="hero-fire pointer-events-none absolute left-1/2 top-[46%] h-[620px] w-[420px] -translate-x-1/2 -translate-y-1/2 sm:top-[44%] sm:h-[700px] sm:w-[460px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,63,255,0.25),_transparent_65%)] mix-blend-screen"
            aria-hidden
          />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
              Store Coming Soon!
            </span>
            <Image
              src="/affordable-peptides-logo-transparent.png"
              alt="Affordable Peptides logo"
              width={720}
              height={360}
              priority
              className="h-auto w-full max-w-[480px] drop-shadow-[0_0_35px_rgba(168,85,247,0.45)]"
            />
            <h1 className="mt-10 max-w-3xl text-balance text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              High-purity, research-grade peptides delivered with honesty,
              transparency, and uncompromising quality.
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-base text-zinc-300 sm:text-lg">
              Affordable Peptides brings together rigorous science, transparent
              third-party testing, and fair pricing so you can focus on what
              matters most—advancing results that make a difference.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#contact"
                className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(120,48,255,0.35)] transition hover:bg-purple-500 hover:shadow-[0_16px_30px_rgba(120,48,255,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Contact Us
              </a>
              <a
                href="#vision"
                className="rounded-full border border-purple-500/60 px-6 py-3 text-sm font-semibold text-purple-200 transition hover:border-purple-400 hover:text-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Coming Soon
              </a>
            </div>
          </div>
        </section>


        <section
          id="contact"
          className="relative px-6 sm:px-12 lg:px-16"
          aria-labelledby="contact-heading"
        >
          <div className="relative mx-auto max-w-4xl">
            <div
              className="absolute inset-0 rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black shadow-[0_25px_70px_rgba(70,0,110,0.45)]"
              aria-hidden
            />
            <div className="relative space-y-6 px-6 py-14 text-center sm:px-12 sm:py-16">
              <span className="inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
                Contact
              </span>
              <h2
                id="contact-heading"
                className="text-3xl font-semibold text-white sm:text-4xl"
              >
                Talk With Affordable Peptides
              </h2>
              <p className="mx-auto max-w-2xl text-balance text-base text-zinc-300 sm:text-lg">
              Until store is developed please text for product list and pricing. Reach out anytime and we&apos;ll get back to you
                quickly.
              </p>
              <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-purple-900/60 bg-black/60 p-6">
                <span className="text-sm uppercase tracking-[0.35em] text-purple-200">
                  Phone
                </span>
                <a
                  href="tel:9515393821"
                  className="text-2xl font-semibold text-white transition hover:text-purple-200"
                >
                  (951) 539-3821
                </a>
                <p className="text-xs text-zinc-500">
                  Available daily 6am–9pm PST.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
