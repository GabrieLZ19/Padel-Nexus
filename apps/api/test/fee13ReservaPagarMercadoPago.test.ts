import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  METODO_MP_RESERVA_SOLO_CHECKOUT,
  assertMetodoPagoManualReservaPermitido,
  metodosPagoReservaDisponibles,
} from "../src/utils/metodos-pago-reserva.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const clubConManual: Parameters<typeof assertMetodoPagoManualReservaPermitido>[0] =
  {
    suscripcion_sin_comisiones: true,
    cbu: "1234567890123456789012",
    pago_transferencia_habilitado: true,
    pago_efectivo_habilitado: true,
  };

describe("FEE-13 POST /reservas/:id/pagar rechaza confirmación falsa de Mercado Pago", () => {
  it("assertMetodoPagoManualReservaPermitido rechaza mercadopago", () => {
    assert.throws(
      () => assertMetodoPagoManualReservaPermitido(clubConManual, "mercadopago"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, METODO_MP_RESERVA_SOLO_CHECKOUT);
        return true;
      },
    );
    assert.throws(
      () => assertMetodoPagoManualReservaPermitido(clubConManual, "MercadoPago"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, METODO_MP_RESERVA_SOLO_CHECKOUT);
        return true;
      },
    );
  });

  it("metodosPagoReservaDisponibles sigue ofreciendo mercadopago para el checkout", () => {
    const metodos = metodosPagoReservaDisponibles(clubConManual);
    assert.ok(metodos.includes("mercadopago"));
    assert.ok(metodos.includes("transferencia"));
    assert.ok(metodos.includes("efectivo"));
  });

  it("assertMetodoPagoManualReservaPermitido acepta transferencia y efectivo habilitados", () => {
    assert.doesNotThrow(() =>
      assertMetodoPagoManualReservaPermitido(clubConManual, "transferencia"),
    );
    assert.doesNotThrow(() =>
      assertMetodoPagoManualReservaPermitido(clubConManual, "efectivo"),
    );
  });

  it("confirmarPago usa assertMetodoPagoManualReservaPermitido", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    assert.match(src, /assertMetodoPagoManualReservaPermitido/);
    assert.doesNotMatch(
      src,
      /assertMetodoPagoReservaPermitido\(clubEmbed/,
    );
  });

  it("confirmar-retorno de reservas valida titular y consulta Mercado Pago", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/reserva.controller.ts"),
      "utf8",
    );
    const svc = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    const bloqueRetorno = ctrl.slice(
      ctrl.indexOf("async confirmarRetornoPago"),
      ctrl.indexOf("async validarTransferenciaPago"),
    );
    assert.match(bloqueRetorno, /confirmarPagoReservaRetorno/);
    assert.match(bloqueRetorno, /Se requiere el payment_id de Mercado Pago/);
    assert.doesNotMatch(bloqueRetorno, /TEST-TOKEN-MOCK/);
    assert.doesNotMatch(bloqueRetorno, /mockPago/);
    assert.match(svc, /validarPagoMercadoPagoAprobado/);
    assert.match(svc, /externalReferenceEsperada: reservaId/);
  });
});