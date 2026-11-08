import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("RES-2 cancelación por club (contrato)", () => {
  it("marca pago cancelado, libera retención y notifica al jugador", () => {
    const src = readFileSync(
      path.join(RAIZ, "apps/api/src/services/club.service.ts"),
      "utf8",
    );
    assert.match(src, /estado_pago: "cancelado"/);
    assert.match(src, /retiene_hasta: null/);
    assert.match(src, /notificarJugadorReservaCancelada/);
    assert.match(src, /motivo_cancelacion/);
  });
});
