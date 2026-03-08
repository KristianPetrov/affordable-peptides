import { LegalPageLayout } from "../LegalPageLayout";

export default function RefundPolicyPage ()
{
  return (
    <LegalPageLayout
      title="Refund and Returns Policy"
      lastUpdated="March 6, 2026"
      summary="How refund and replacement requests are reviewed and processed."
    >
      <section>
        <h2 className="text-xl font-semibold text-white">All Requests Are Reviewed</h2>
        <p className="mt-2">
          Due to product category and handling standards, refund and replacement
          requests are reviewed case by case. Approval depends on order status,
          package condition, and supporting documentation.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Damaged or Incorrect Orders</h2>
        <p className="mt-2">
          If an order arrives damaged or incorrect, contact support promptly with
          your order number and clear photos of the package and labels. We will
          review and provide next steps.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Non-Returnable Conditions</h2>
        <p className="mt-2">
          Products that have been opened, used, or mishandled are generally not
          eligible for return. Requests made outside the review window may also be
          declined.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Approved Refund Timing</h2>
        <p className="mt-2">
          If a refund is approved, processing time depends on payment method and
          financial institution timelines. Confirmation is sent when the refund is
          issued.
        </p>
      </section>
    </LegalPageLayout>
  );
}
