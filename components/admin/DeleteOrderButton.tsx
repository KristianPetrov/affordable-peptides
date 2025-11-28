"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrderAction } from "@/app/actions/admin";

type DeleteOrderButtonProps = {
  orderId: string;
  orderNumber: string;
};

export function DeleteOrderButton({
  orderId,
  orderNumber,
}: DeleteOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteOrderAction(orderId);
      if (result.success) {
        router.refresh();
      } else {
        alert(`Failed to delete order: ${result.error}`);
        setShowConfirm(false);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="w-full rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending
        ? "Deleting..."
        : showConfirm
        ? `Confirm Delete Order ${orderNumber}`
        : "Delete Order"}
    </button>
  );
}

