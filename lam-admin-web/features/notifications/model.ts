/**
 * Alarm-facing view of a pending `customer_requests` row. This intentionally
 * covers only general ("바로 전달하기") and song requests — special requests
 * (`special_requests`) are not part of the notification feature, per the
 * confirmed requirement in `docs/plans/2026-09-04-admin-request-notifications.md`.
 * There is therefore nothing here to merge with `features/special-requests`.
 */
export type RequestNotificationKind = "general" | "song";

export type RequestNotification = {
  id: string;
  kind: RequestNotificationKind;
  tableNumber: string;
  preview: string;
  createdAt: string;
};
