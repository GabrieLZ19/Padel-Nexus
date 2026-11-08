import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enmascararDni } from "../src/utils/enmascararDni.ts";

describe("ENT-1: verificación pública de carné", () => {
  it("enmascara el DNI dejando solo los últimos 4 dígitos", () => {
    assert.equal(enmascararDni("22377800"), "•••• 7800");
    assert.equal(enmascararDni("12.345.678"), "•••• 5678");
    assert.equal(enmascararDni(""), null);
    assert.equal(enmascararDni(null), null);
  });
});
