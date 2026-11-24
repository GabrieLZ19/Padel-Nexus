import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-15 confirmar-retorno inscripción: mensaje claro si el pago no existe en MP", () => {
  it("validarPagoMercadoPago mapea pago inexistente a mensaje explícito", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/utils/validarPagoMercadoPago.ts"),
      "utf8",
    );
    assert.match(src, /No se encontró el pago en Mercado Pago/);
    assert.doesNotMatch(src, /Error desconocido/);
  });

  it("confirmarPagoInscripcionRetorno valida en MP antes de acreditar", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(src, /confirmarPagoInscripcionRetorno/);
    assert.match(src, /validarPagoMercadoPagoAprobado/);
    assert.match(src, /coincideReferencia/);
    assert.match(src, /parseMercadoPagoExternalReference/);
  });

  it("controller devuelve error.message directo (sin envolver en Error desconocido)", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/controllers/inscripcion.controller.ts"),
      "utf8",
    );
    const bloque = src.slice(
      src.indexOf("export const confirmarRetornoPagoInscripcion"),
      src.indexOf("export const getElegibilidadInscripcion"),
    );
    assert.match(bloque, /confirmarPagoInscripcionRetorno/);
    assert.match(bloque, /exito: false, error: message/);
    assert.doesNotMatch(bloque, /Error desconocido/);
    assert.doesNotMatch(bloque, /paymentClient\.get/);
  });
});

describe("Regresión FEE-13 y FEE-14 (pagos reales)", () => {
  it("FEE-13: manual /pagar bloquea mercadopago y retorno usa validación MP", () => {
    const metodos = readFileSync(
      path.join(RAIZ, "src/utils/metodos-pago-reserva.ts"),
      "utf8",
    );
    const reservaSvc = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    assert.match(metodos, /assertMetodoPagoManualReservaPermitido/);
    assert.match(reservaSvc, /confirmarPagoReservaRetorno/);
    assert.match(reservaSvc, /validarPagoMercadoPagoAprobado/);
  });

  it("FEE-14: marketplace retorno exige payment_id y valida comprador en MP", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/marketplace.controller.ts"),
      "utf8",
    );
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(ctrl, /confirmarPagoOrdenRetorno/);
    assert.match(svc, /No tenés permiso para confirmar el pago de esta orden/);
    assert.doesNotMatch(svc, /mock-mp-\$\{Date\.now\(\)\}/);
  });
});