import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("메뉴 주문은 서버 주문을 만든 뒤 토스 결제 화면으로 이동한다", async () => {
  const card = await readFile(
    new URL("../components/menu/menu-item-card.tsx", import.meta.url),
    "utf8",
  );
  const checkout = await readFile(
    new URL("../components/payments/checkout-screen.tsx", import.meta.url),
    "utf8",
  );

  assert.match(card, /createPaymentOrder/);
  assert.match(card, /router\.push\(`\/checkout\?orderId=/);
  assert.match(checkout, /https:\/\/js\.tosspayments\.com\/v2\/standard/);
  assert.match(checkout, /widgets\(\{ customerKey: TossPayments\.ANONYMOUS \}\)/);
  assert.match(checkout, /value: paymentOrder\.amount/);
});

test("결제 API 프록시는 QR 세션과 서버 전용 토큰을 확인한다", async () => {
  const source = await readFile(
    new URL("../app/api/payments/orders/route.ts", import.meta.url),
    "utf8",
  );
  const helper = await readFile(
    new URL("../lib/payment-api-server.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /hasPaymentSession/);
  assert.match(helper, /isQrSessionValid/);
  assert.match(helper, /PAYMENT_API_TOKEN/);
  assert.doesNotMatch(helper, /NEXT_PUBLIC_PAYMENT_API_TOKEN/);
});
