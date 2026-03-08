import { LegalPageLayout } from "../LegalPageLayout";

export default function TermsOfUsePage ()
{
  return (
    <LegalPageLayout
      title="Terms of Use"
      lastUpdated="March 6, 2026"
      summary="By using this website or placing an order, you agree to these terms."
    >
      <section>
        <h2 className="text-xl font-semibold text-white">Website Use</h2>
        <p className="mt-2">
          You agree to use this website lawfully and only for legitimate business
          or research procurement purposes. Misuse, scraping, fraud, or attempts
          to bypass security controls may result in blocked access and order
          cancellation.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Eligibility</h2>
        <p className="mt-2">
          You must be at least 18 years old to access or use this website. By
          placing an order, you confirm you are legally allowed to purchase and
          receive these products in your jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Research-Use Restrictions</h2>
        <p className="mt-2">
          All products are sold strictly for laboratory research use only and are
          not intended for human or animal consumption, diagnosis, treatment, or
          therapeutic use.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Pricing and Orders</h2>
        <p className="mt-2">
          We may update pricing, product availability, and descriptions at any
          time. Receipt of an order confirmation does not guarantee acceptance.
          Orders may be reviewed, held, or canceled for compliance, fraud
          prevention, inventory, or payment-verification reasons.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Account Responsibility</h2>
        <p className="mt-2">
          You are responsible for maintaining accurate account details and keeping
          account credentials secure. You are responsible for activity performed
          through your account.
        </p>
      </section>
    </LegalPageLayout>
  );
}
