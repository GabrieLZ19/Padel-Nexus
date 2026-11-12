import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  limitePagoReserva,
  retencionMercadoPagoDesde,
} from "../src/utils/reservaRetencion.ts";
import { RESERVA_MP_RETENCION_MINUTOS } from "../src/constants/reserva.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-12 plazo visible de pago pendiente", () => {
  it("TTL de Mercado Pago es 15 minutos", () => {
    assert.equal(RESERVA_MP_RETENCION_MINUTOS, 15);
    const ahora = new Date("2026-11-07T15:00:00.000Z");
    assert.equal(
      retencionMercadoPagoDesde(ahora),
      "2026-11-07T15:15:00.000Z",
    );
  });

  it("limitePagoReserva usa retiene_hasta o created_at", () => {
    const desde = limitePagoReserva({
      estado_reserva: "pendiente",
      retiene_hasta: "2026-11-07T15:20:00.000Z",
    });
    assert.equal(desde?.toISOString(), "2026-11-07T15:20:00.000Z");

    const fallback = limitePagoReserva({
      estado_reserva: "pendiente",
      created_at: "2026-11-07T15:00:00.000Z",
    });
    assert.equal(fallback?.toISOString(), "2026-11-07T15:20:00.000Z");
  });

  it("servicio notifica, libera y expone TTL en preferencia MP", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    assert.match(svc, /liberarPendientesExpiradasUsuario/);
    assert.match(svc, /enviarNotificacionReservaPagoVencido/);
    assert.match(svc, /expiration_date_to:\s*retieneHastaMp/);
    assert.match(svc, /RESERVA_PAGO_VENCIDO/);
  });
});
