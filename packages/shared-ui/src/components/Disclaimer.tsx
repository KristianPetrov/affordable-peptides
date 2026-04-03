type DisclaimerProps = {
  className?: string;
  variant?: "default" | "compact";
};

export default function Disclaimer ({
  className = "",
  variant = "default",
}: DisclaimerProps)
{
  if (variant === "compact") {
    return (
      <div
        className={`rounded-2xl border border-purple-900/60 bg-purple-500/10 px-4 py-3 text-xs text-purple-200 ${className}`}
      >
        <p className="font-semibold uppercase tracking-[0.2em] mb-2">
          Research Use Only
        </p>
        <p className="text-zinc-300 leading-relaxed">
          All peptides and related products listed on this website are sold
          strictly for laboratory research use only. They are not intended for
          human or animal consumption, medical use, diagnostic use,
          therapeutic use, or as drugs, foods, cosmetics, or household items.
          None of the statements or product descriptions on this site have been
          evaluated by the FDA or any other regulatory authority. Research
          compounds should be handled only by qualified professionals in
          appropriate laboratory settings, in accordance with all applicable laws
          and safety guidelines.
        </p>
      </div>
    );
  }

  return (
    <section
      className={`rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6 sm:p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)] ${className}`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
            Legal Notice
          </span>
        </div>
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Research Use Only
        </h2>
        <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
          <p>
            All peptides and related products listed on this website are sold
            strictly for laboratory research use only. They are not intended
            for human or animal consumption, medical use, diagnostic use,
            therapeutic use, or as drugs, foods, cosmetics, or household items.
          </p>
          <p>
            None of the statements or product descriptions on this site have been
            evaluated by the FDA or any other regulatory authority. Research
            compounds should be handled only by qualified professionals in
            appropriate laboratory settings, in accordance with all applicable
            laws and safety guidelines.
          </p>
        </div>
      </div>
    </section>
  );
}







