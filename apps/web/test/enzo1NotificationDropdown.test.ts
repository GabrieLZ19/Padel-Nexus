import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeNotificationDropdownPosition } from "../utils/notificationDropdownPosition.ts";

describe("ENZO-1 / RES-15: posicion del panel de notificaciones", () => {
  it("usa left cuando la campana esta en el sidebar izquierdo", () => {
    const rect = {
      top: 40,
      bottom: 80,
      left: 20,
      right: 60,
    };
    const anchor = computeNotificationDropdownPosition(rect, 1280);
    assert.equal(anchor.top, 92);
    assert.equal(anchor.left, 20);
    assert.equal(anchor.right, undefined);
    assert.ok(anchor.left! + 384 <= 1280 - 12);
  });

  it("mantiene right cuando hay espacio a la izquierda del panel", () => {
    const rect = {
      top: 40,
      bottom: 80,
      left: 900,
      right: 940,
    };
    const anchor = computeNotificationDropdownPosition(rect, 1280);
    assert.equal(anchor.right, 1280 - 940);
    assert.equal(anchor.left, undefined);
  });
});