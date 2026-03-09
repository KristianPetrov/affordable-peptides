export default function ResearchSection ()
{
  return (
    <section
      id="research"
      className="relative px-6 sm:px-12 lg:px-16"
      aria-labelledby="research-heading"
    >
      <div className="relative mx-auto max-w-5xl space-y-10 rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#0b0011] via-[#140024] to-[#1d0032] px-6 py-14 shadow-[0_22px_65px_rgba(55,0,105,0.45)] sm:px-12 sm:py-16">
        <div className="space-y-4 text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
            Technical Reference
          </span>
          <h2
            id="research-heading"
            className="text-3xl font-semibold text-white sm:text-4xl"
          >
            Analytical Standards
          </h2>
          <p className="text-base text-zinc-300 sm:text-lg">
            Technical notes about purity reporting, analytical testing, and
            laboratory documentation standards.
          </p>
        </div>
        <dl className="space-y-10 text-left">
          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              What does peptide purity mean?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              Peptide purity describes what percentage of the material is the
              intended sequence. The remaining fraction is usually
              non-target material such as moisture, salts, or tiny peptide
              fragments that form naturally
              during synthesis.
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              Is 97-98% purity considered high quality?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              Yes. Research-grade peptides routinely fall between 95-99% purity.
              A result in the 97-98% range is considered excellent and well
              within normal expectations.
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              Why isn&apos;t every peptide 99%+ pure?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              Ultra-high purity can be impractical. Complex sequences often
              require trade-offs between purity and yield, and pushing above 99%
              rarely delivers meaningful improvements.
            </dd>
          </div>

          <div className="space-y-4">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              What causes purity to be slightly lower sometimes?
            </dt>
            <dd className="space-y-4 text-base leading-7 text-zinc-300">
              <p>
                Small differences typically trace back to normal production
                variables such as:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                <li>Natural byproducts from peptide synthesis</li>
                <li>Trace moisture or residual solvents</li>
                <li>Small amounts of salts or counter-ions</li>
                <li>Complex or long peptide sequences</li>
                <li>Minor natural oxidation</li>
                <li>Differences in HPLC testing methods</li>
              </ul>
              <p>These variations are expected and do not signal contamination or poor quality.</p>
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              How should labs interpret small purity differences?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              Small differences between 97%, 98%, and 99% purity should be read
              in the context of the chromatogram, identity data, and overall lot
              documentation. The dominant material can still be the intended
              sequence even when a report is below 99%.
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              What typically composes the remaining 1-3%?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              The small remainder is commonly water, buffer residues, or
              microscopic peptide fragments formed during synthesis and
              purification. Analytical reports and identity testing help labs
              characterize that remainder appropriately.
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              Why do different tests show slightly different purity?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              HPLC data can vary based on column selection, solvent systems, and
              detector settings. Minor shifts between labs are completely normal,
              even for very clean peptides.
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              If purity isn&apos;t the only factor, what else matters?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              Consistency, transparency, and third-party validation matter more
              than chasing a 1-2% difference. Clean chromatograms and matching
              identity statements provide real confidence.
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-lg font-semibold text-white sm:text-xl">
              Does higher purity always mean stronger documentation?
            </dt>
            <dd className="text-base leading-7 text-zinc-300">
              Not necessarily. A 98% lot with documented HPLC data and identity
              confirmation is generally more informative than a vague 99%+ claim
              with no supporting evidence. Authentic data beats marketing
              language every time.
            </dd>
          </div>
        </dl>
        <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 px-6 py-5 text-center sm:px-8 sm:py-6">
          <p className="text-base font-semibold text-white sm:text-lg">
            Bottom line: purity in the 97-99% range is commonly reported for
            research materials, and transparent analytical documentation matters
            more than marketing language around a single number.
          </p>
        </div>
      </div>
    </section>
  );
}

