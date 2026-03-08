import { LegalPageLayout } from "../LegalPageLayout";

export default function PrivacyPolicyPage ()
{
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="March 6, 2026"
      summary="This policy explains what information we collect and how it is used."
    >
      <section>
        <h2 className="text-xl font-semibold text-white">Information We Collect</h2>
        <p className="mt-2">
          We collect information you provide directly, including contact details,
          shipping information, account information, and order history. We also
          collect limited technical data needed for security, analytics, and site
          performance.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">How We Use Information</h2>
        <p className="mt-2">
          Data is used to process orders, provide customer support, prevent fraud,
          improve website performance, and fulfill legal obligations. We do not
          use customer data for purposes that conflict with these objectives.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Payment and Security</h2>
        <p className="mt-2">
          Payment details are processed through approved payment infrastructure.
          We do not store full card numbers or CVV data on our systems.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Sharing and Retention</h2>
        <p className="mt-2">
          We share information only with service providers required to operate the
          business, such as payment processors, shipping partners, and email
          providers. Records are retained only as long as needed for operations,
          security, and legal compliance.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Your Choices</h2>
        <p className="mt-2">
          You may request access, correction, or deletion of eligible personal
          information by contacting support. Some data may be retained when
          required by law, fraud prevention, or accounting obligations.
        </p>
      </section>
    </LegalPageLayout>
  );
}
