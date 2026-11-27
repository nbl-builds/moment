import type { Enums } from "@moment/shared";

export const STATUS_LABELS: Record<Enums<"booking_status">, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled_by_consumer: "Cancelled by guest",
  cancelled_by_business: "Cancelled by you",
  no_show: "No-show",
};

export const STATUS_TONE: Record<Enums<"booking_status">, "pending" | "confirmed" | "cancelled" | "done"> = {
  pending: "pending",
  confirmed: "confirmed",
  completed: "done",
  cancelled_by_consumer: "cancelled",
  cancelled_by_business: "cancelled",
  no_show: "done",
};

export const PAYMENT_LABELS: Record<Enums<"booking_payment_status">, string> = {
  unpaid: "Not paid yet",
  partially_paid: "Partly paid",
  paid: "Paid",
  partially_refunded: "Partly refunded",
  refunded: "Refunded",
};
