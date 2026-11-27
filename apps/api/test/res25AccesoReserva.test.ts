import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-25 acceso a reserva", () => {
  it("controller valida acceso en GET, preview y preferencia MP", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/reserva.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /assertUsuarioPuedeAccederReserva/);
    assert.match(ctrl, /getReservaPorId[\s\S]*assertUsuarioPuedeAccederReserva/);
    assert.match(
      ctrl,
      /previewCheckoutMercadoPago[\s\S]*assertUsuarioPuedeAccederReserva/,
    );
    assert.match(
      ctrl,
      /crearPreferenciaPago[\s\S]*assertUsuarioPuedeAccederReserva/,
    );
  });
});