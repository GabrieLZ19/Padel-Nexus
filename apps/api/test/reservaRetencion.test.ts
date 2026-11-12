import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  reservaOcupaTurno,
  reservaPendienteExpirada,
  retencionMercadoPagoDesde,
} from "../src/utils/reservaRetencion.ts";

describe("retención de reserva pendiente (RES-1)", () => {
  const ahora = new Date("2026-11-07T15:00:00.000Z");

  it("confirmada siempre ocupa el turno", () => {
    assert.equal(
      reservaOcupaTurno({ estado_reserva: "confirmada" }, ahora),
      true,
    );
  });

  it("pendiente vigente por retiene_hasta bloquea el turno", () => {
    assert.equal(
      reservaOcupaTurno(
        {
          estado_reserva: "pendiente",
          retiene_hasta: "2026-11-07T15:30:00.000Z",
        },
        ahora,
      ),
      true,
    );
  });

  it("pendiente con retiene_hasta vencido no ocupa", () => {
    assert.equal(
      reservaOcupaTurno(
        {
          estado_reserva: "pendiente",
          retiene_hasta: "2026-11-07T14:50:00.000Z",
        },
        ahora,
      ),
      false,
    );
    assert.equal(
      reservaPendienteExpirada(
        {
          estado_reserva: "pendiente",
          retiene_hasta: "2026-11-07T14:50:00.000Z",
        },
        ahora,
      ),
      true,
    );
  });

  it("extiende retención al abrir Mercado Pago", () => {
    const hasta = retencionMercadoPagoDesde(ahora);
    assert.equal(hasta, "2026-11-07T15:15:00.000Z");
  });
});
