import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("메뉴 뱃지는 금액 영역 위에 있고 없는 메뉴도 빈 슬롯을 유지한다", async () => {
  const source = await readFile(
    new URL("../components/menu/menu-item-card.tsx", import.meta.url),
    "utf8",
  );

  const sideIndex = source.indexOf('className="menu-side"');
  const badgeIndex = source.indexOf("menu-badge-placeholder");
  const priceIndex = source.indexOf('className="menu-price"');

  assert.ok(sideIndex >= 0);
  assert.ok(badgeIndex > sideIndex);
  assert.ok(priceIndex > badgeIndex);
});
