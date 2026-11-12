import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  formatearCuentaRegresiva,
  msRestantesPlazoPago,
} from "../utils/reservaPlazoPago.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-12 UI plazo de pago", () => {
  it("cuenta regresiva desde retiene_hasta", () => {
    const reserva = {
      estado_reserva: "pendiente",
      estado_pago: "pendiente",
      retiene_hasta: "2030-01-01T12:20:00.000Z",
    };
    const ms = msRestantesPlazoPago(reserva, Date.parse("2030-01-01T12:10:00.000Z"));
    assert.equal(ms, 10 * 60 * 1000);
    assert.equal(formatearCuentaRegresiva(ms!), "10:00");
  });

  it("checkout y mis reservas muestran banner de plazo", () => {
    const checkout = readFileSync(
      path.join(RAIZ, "app/(public)/reservar/checkout/[reserva_id]/page.tsx"),
      "utf8",
    );
    const mis = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/reservas/page.tsx"),
      "utf8",
    );
    assert.match(checkout, /ReservaPlazoPagoBanner/);
    assert.match(mis, /ReservaPlazoPagoBanner/);
  });
});
