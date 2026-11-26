import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { RESERVA_ESTADOS_PAGO } from "../src/constants/reserva.ts";
import { montoTurnoDesdeReserva } from "../src/utils/reservaMontoTurno.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-22 pago en el club", () => {
  it("montoTurnoDesdeReserva toma el precio del turno embebido", () => {
    assert.equal(
      montoTurnoDesdeReserva({ turnos: { precio: 12500 } }),
      12500,
    );
    assert.equal(
      montoTurnoDesdeReserva({ turnos: [{ precio: 8000 }] }),
      8000,
    );
    assert.throws(
      () => montoTurnoDesdeReserva({ turnos: { precio: undefined } }),
      /No se pudo determinar el precio del turno/,
    );
  });

  it("confirmarPago deja efectivo en confirmada + pendiente_en_club sin pago completado", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async confirmarPago"),
      svc.indexOf("static async cancelarReserva"),
    );
    assert.match(bloque, /montoTurnoDesdeReserva/);
    assert.match(bloque, /RESERVA_ESTADOS_PAGO\.PENDIENTE_EN_CLUB/);
    assert.match(bloque, /estadoReserva = esTransferencia \? "pendiente" : "confirmada"/);
    assert.match(bloque, /estadoPagoRegistro = esEfectivo \|\| esTransferencia \? "pendiente"/);
    assert.match(bloque, /enviarNotificacionesPagoEnClubPendiente/);
    assert.match(
      bloque,
      /} else if \(esEfectivo\) {\s*this\.enviarNotificacionesPagoEnClubPendiente/,
    );
  });

  it("POST pagar no exige monto del cliente", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/reserva.controller.ts"),
      "utf8",
    );
    const bloque = ctrl.slice(
      ctrl.indexOf("async pagarReserva"),
      ctrl.indexOf("async cancelarReserva"),
    );
    assert.match(bloque, /Se requiere metodo_pago/);
    assert.doesNotMatch(bloque, /Se requieren monto y metodo_pago/);
    assert.doesNotMatch(bloque, /parseFloat\(monto\)/);
  });

  it("expone constante pendiente_en_club", () => {
    assert.equal(RESERVA_ESTADOS_PAGO.PENDIENTE_EN_CLUB, "pendiente_en_club");
  });

  it("gestionarReservaClub cobra con precio del turno", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("gestionarReservaClub"),
      svc.indexOf("static async ajustarPreciosMasivos"),
    );
    assert.match(bloque, /const monto = Number\(turno\?\.precio\)/);
    assert.match(bloque, /estado_pago: "completado"/);
  });
});