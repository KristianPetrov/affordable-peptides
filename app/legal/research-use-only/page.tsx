import { LegalPageLayout } from "../LegalPageLayout";

export default function ResearchUseOnlyPage ()
{
  return (
    <LegalPageLayout
      title="Research Use Only Disclaimer"
      lastUpdated="March 6, 2026"
      summary="All products sold on this website are restricted to laboratory research use."
    >
      <section>
        <h2 className="text-xl font-semibold text-white">Intended Use</h2>
        <p className="mt-2">
          Products listed on this website are supplied strictly for laboratory and
          analytical research use by qualified professionals.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Prohibited Uses</h2>
        <p className="mt-2">
          Products are not intended for human or animal consumption, diagnosis,
          treatment, therapeutic use, food use, cosmetic use, or household use.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Regulatory Statement</h2>
        <p className="mt-2">
          Statements and product descriptions on this website are not medical
          claims and have not been evaluated for therapeutic purposes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Buyer Responsibilities</h2>
        <p className="mt-2">
          Buyers are responsible for complying with local laws and for proper
          storage, handling, and use in suitable laboratory environments.
        </p>
      </section>
    </LegalPageLayout>
  );
}
