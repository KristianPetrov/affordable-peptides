export default function MissionSection ()
{
  return (
    <section
      id="mission"
      className="relative px-6 sm:px-12 lg:px-16"
      aria-labelledby="mission-heading"
    >
      <div className="relative mx-auto max-w-5xl">
        <div className="theme-card-gradient absolute inset-0 rounded-3xl" aria-hidden />
        <div className="relative space-y-6 px-6 py-14 sm:px-12 sm:py-16">
          <h2
            id="mission-heading"
            className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-300"
          >
            Mission Statement
          </h2>
          <p className="text-lg leading-8 text-zinc-200 sm:text-xl">
            Affordable Peptides exists to make high-quality, research-grade
            peptides accessible without the inflated pricing or industry
            mark up. Our mission is to deliver reliable purity documentation,
            transparent third-party testing, and clear information so research teams
            can make informed sourcing decisions with confidence. We combine integrity,
            science, and responsible practices to raise the standard for the
            entire peptide space.
          </p>
        </div>
      </div>
    </section>
  );
}

