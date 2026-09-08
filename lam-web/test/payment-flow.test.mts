import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("메뉴 주문은 결제 화면 없이 토스 POS 주문을 등록하고 완료를 표시한다", async () => {
  const card = await readFile(
    new URL("../components/menu/menu-item-card.tsx", import.meta.url),
    "utf8",
  );
  const service = await readFile(
    new URL("../services/order-service.ts", import.meta.url),
    "utf8",
  );

  assert.match(card, /createOrder/);
  assert.match(card, /주문이 접수됐어요/);
  assert.doesNotMatch(card, /\/checkout/);
  assert.match(service, /fetch\("\/api\/orders"/);
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

test("주문 API 프록시는 QR 세션과 서버 전용 토큰을 확인한다", async () => {
  const source = await readFile(
    new URL("../app/api/orders/route.ts", import.meta.url),
    "utf8",
  );
  const helper = await readFile(
    new URL("../lib/payment-api-server.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /hasPaymentSession/);
  assert.match(source, /\/api\/v1\/orders/);
  assert.match(helper, /PAYMENT_API_TOKEN/);
});
