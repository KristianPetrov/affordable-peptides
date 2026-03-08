import { LegalPageLayout } from "../LegalPageLayout";

export default function ShippingPolicyPage ()
{
  return (
    <LegalPageLayout
      title="Shipping Policy"
      lastUpdated="March 6, 2026"
      summary="Shipping timelines and delivery expectations for approved orders."
    >
      <section>
        <h2 className="text-xl font-semibold text-white">Order Processing</h2>
        <p className="mt-2">
          Most approved orders are processed within 1-2 business days. Processing
          may take longer during high-volume periods, payment review, or inventory
          validation.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Shipment Timing</h2>
        <p className="mt-2">
          Delivery times are estimates and may vary by destination, carrier
          performance, weather, and regulatory delays. Shipping timelines are not
          guaranteed once a package leaves our facility.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Address Accuracy</h2>
        <p className="mt-2">
          Customers are responsible for providing accurate shipping information.
          Orders delayed or returned due to incorrect addresses may require
          additional verification and shipping charges before reshipment.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Tracking and Delivery</h2>
        <p className="mt-2">
          Tracking details are provided when available. If tracking shows delivered
          but you cannot locate the package, contact the carrier first and then
          contact support with your order number.
        </p>
      </section>
    </LegalPageLayout>
  );
}
