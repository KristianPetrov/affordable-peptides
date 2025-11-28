"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { submitOrderStatusForm } from "@/app/actions/admin";
import type { OrderStatusFormState } from "@/app/actions/admin";
import { TrackingNumberInput } from "@/components/admin/TrackingNumberInput";
import type { OrderStatus } from "@/lib/orders";

type OrderStatusFormProps = {
  orderId: string;
  currentStatus: OrderStatus;
  currentTrackingNumber?: string;
  currentTrackingCarrier?: "UPS" | "USPS";
};

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "PAID", label: "Paid" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function OrderStatusForm({
  orderId,
  currentStatus,
  currentTrackingNumber,
  currentTrackingCarrier,
}: OrderStatusFormProps) {
  const router = useRouter();
  const initialState = useMemo<OrderStatusFormState>(
    () => ({
      orderId,
      status: currentStatus,
      success: true,
      trackingNumber: currentTrackingNumber,
      trackingCarrier: currentTrackingCarrier,
    }),
    [orderId, currentStatus, currentTrackingCarrier, currentTrackingNumber]
  );
  const [formState, formAction, pending] = useActionState(
    submitOrderStatusForm,
    initialState
  );
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus);
  const lastUpdatedRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    if (formState.status && !pending) {
      setSelectedStatus(formState.status);
    }
  }, [formState.status, pending]);

  useEffect(() => {
    if (formState.updatedAt && formState.updatedAt !== lastUpdatedRef.current) {
      lastUpdatedRef.current = formState.updatedAt;
      router.refresh();
    }
  }, [formState.updatedAt, router]);

  const feedbackMessage = formState.error ?? formState.message;
  const feedbackClass =
    formState.error !== undefined ? "text-red-400" : "text-green-400";

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <select
        name="status"
        id={`status-${orderId}`}
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}
        className="w-full rounded-lg border border-purple-900/40 bg-black/60 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <TrackingNumberInput
        orderId={orderId}
        selectedStatus={selectedStatus}
        currentTrackingNumber={formState.trackingNumber ?? currentTrackingNumber}
        currentTrackingCarrier={formState.trackingCarrier ?? currentTrackingCarrier}
      />
      <textarea
        name="notes"
        placeholder="Optional notes..."
        className="w-full rounded-lg border border-purple-900/40 bg-black/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
        rows={2}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-900"
      >
        {pending ? "Saving..." : "Update Status"}
      </button>
      {feedbackMessage ? (
        <p
          aria-live="polite"
          className={`text-xs ${feedbackClass}`}
        >
          {feedbackMessage}
        </p>
      ) : null}
    </form>
  );
}

