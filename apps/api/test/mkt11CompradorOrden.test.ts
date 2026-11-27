import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-11 comprador en preview y pago", () => {
  it("preview y crear preferencia validan comprador_id", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(svc, /assertCompradorOrden/);
    assert.match(svc, /previewCheckoutOrden\(ordenId: string, compradorId: string\)/);
    assert.match(
      svc,
      /crearPreferenciaMercadoPago\(\s*\n?\s*ordenId: string,\s*\n?\s*compradorId: string/,
    );
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/marketplace.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /previewCheckoutOrden\(\s*\n?\s*req\.params\.id,\s*\n?\s*compradorId/);
    assert.match(
      ctrl,
      /crearPreferenciaMercadoPago\(\s*\n?\s*req\.params\.id,\s*\n?\s*compradorId/,
    );
  });
});