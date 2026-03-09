export default function MissionSection ()
{
  return (
    <section
      id="mission"
      className="relative px-6 sm:px-12 lg:px-16"
      aria-labelledby="mission-heading"
    >
      <div className="relative mx-auto max-w-5xl">
        <div
          className="absolute inset-0 rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#13001f] via-[#080008] to-black shadow-[0_25px_70px_rgba(70,0,110,0.45)]"
          aria-hidden
        />
        <div className="relative space-y-6 px-6 py-14 sm:px-12 sm:py-16">
          <h2
            id="mission-heading"
            className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-300"
          >
            Mission Statement
          </h2>
          <p className="text-lg leading-8 text-zinc-200 sm:text-xl">
            Affordable Peptides exists to supply laboratory, academic, and
            institutional researchers with clearly cataloged materials,
            transparent analytical documentation, and straightforward ordering.
            Our mission is to present research materials responsibly, avoid
            human-use marketing, and maintain clear research-use-only
            positioning across the site.
          </p>
        </div>
      </div>
    </section>
  );
}

