"use client";

import { useEffect, useState } from "react";
import type { OrderStatus } from "@/lib/orders";

type TrackingNumberInputProps = {
  orderId: string;
  currentStatus: OrderStatus;
  currentTrackingNumber?: string;
  currentTrackingCarrier?: "UPS" | "USPS";
};

export function TrackingNumberInput({
  orderId,
  currentStatus,
  currentTrackingNumber,
  currentTrackingCarrier,
}: TrackingNumberInputProps) {
  const [status, setStatus] = useState(currentStatus);

  useEffect(() => {
    const select = document.getElementById(`status-${orderId}`) as HTMLSelectElement;
    if (select) {
      const updateStatus = () => setStatus(select.value as OrderStatus);
      select.addEventListener("change", updateStatus);
      return () => select.removeEventListener("change", updateStatus);
    }
  }, [orderId]);

  if (status !== "SHIPPED") {
    return null;
  }

  return (
    <div className="space-y-2">
      <div>
        <label
          htmlFor={`tracking-carrier-${orderId}`}
          className="mb-1 block text-xs font-semibold text-purple-200"
        >
          Carrier *
        </label>
        <select
          id={`tracking-carrier-${orderId}`}
          name="trackingCarrier"
          required
          defaultValue={currentTrackingCarrier || ""}
          className="w-full rounded-lg border border-purple-900/40 bg-black/60 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">Select carrier</option>
          <option value="UPS">UPS</option>
          <option value="USPS">USPS</option>
        </select>
      </div>
      <div>
        <label
          htmlFor={`tracking-${orderId}`}
          className="mb-1 block text-xs font-semibold text-purple-200"
        >
          Tracking Number *
        </label>
        <input
          type="text"
          id={`tracking-${orderId}`}
          name="trackingNumber"
          defaultValue={currentTrackingNumber || ""}
          required
          placeholder="Enter tracking number"
          className="w-full rounded-lg border border-purple-900/40 bg-black/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>
    </div>
  );
}


