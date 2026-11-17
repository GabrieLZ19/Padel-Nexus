import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { esReservaVencidaPorPago, RESERVA_MOTIVO_PAGO_VENCIDO } from "../utils/reservaPlazoPago.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-20: estado vencida en panel club", () => {
  it("detecta reserva cancelada por plazo de pago", () => {
    assert.equal(
      esReservaVencidaPorPago({
        estado_reserva: "cancelada",
        motivo_cancelacion: RESERVA_MOTIVO_PAGO_VENCIDO,
      }),
      true,
    );
    assert.equal(
      esReservaVencidaPorPago({
        estado_reserva: "cancelada",
        motivo_cancelacion: "Cancelada por el club",
      }),
      false,
    );
  });

  it("club reservas usa etiqueta Vencida (sin pago)", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/club/reservas/page.tsx"),
      "utf8",
    );
    assert.match(page, /esReservaVencidaPorPago/);
    assert.match(page, /Vencida \(sin pago\)/);
    assert.match(page, /etiquetaEstadoReserva/);
  });

  it("ReservaClubFila expone motivo_cancelacion", () => {
    const panel = readFileSync(
      path.join(RAIZ, "utils/services/club-panel.ts"),
      "utf8",
    );
    assert.match(panel, /motivo_cancelacion\?: string \| null/);
  });
});