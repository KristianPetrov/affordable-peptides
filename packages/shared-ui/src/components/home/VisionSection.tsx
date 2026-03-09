export default function VisionSection ()
{
  return (
    <section
      id="vision"
      className="px-6 sm:px-12 lg:px-16"
      aria-labelledby="vision-heading"
    >
      <div className="mx-auto max-w-5xl space-y-6 rounded-3xl border border-purple-900/60 bg-linear-to-br from-black via-[#090011] to-[#1d0029] px-6 py-14 shadow-[0_20px_60px_rgba(45,0,95,0.45)] sm:px-12 sm:py-16">
        <h2
          id="vision-heading"
          className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-300"
        >
          Vision Statement
        </h2>
        <p className="text-lg leading-8 text-zinc-200 sm:text-xl">
          We aim to be a reliable source of laboratory research materials by
          maintaining transparent documentation, consistent cataloging, and
          clear compliance language. Our vision is a site experience built for
          serious research procurement rather than consumer wellness marketing.
        </p>
      </div>
    </section>
  );
}

