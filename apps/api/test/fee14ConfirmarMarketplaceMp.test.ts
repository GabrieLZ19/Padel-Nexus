import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { paymentIdMercadoPagoValido } from "../src/utils/validarPagoMercadoPago.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-14 confirmar-retorno marketplace valida pago en MP y titularidad", () => {
  it("paymentIdMercadoPagoValido rechaza mobile-return inventado", () => {
    assert.equal(paymentIdMercadoPagoValido("1234567890"), true);
    assert.equal(paymentIdMercadoPagoValido(`mobile-return-${Date.now()}`), false);
    assert.equal(paymentIdMercadoPagoValido(""), false);
  });

  it("marketplace.controller exige payment_id y delega en confirmarPagoOrdenRetorno", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/controllers/marketplace.controller.ts"),
      "utf8",
    );
    assert.match(src, /Se requiere el payment_id de Mercado Pago/);
    assert.match(src, /confirmarPagoOrdenRetorno/);
    assert.doesNotMatch(src, /mobile-return-\$\{Date\.now\(\)\}/);
    assert.doesNotMatch(
      src,
      /confirmarPagoOrden\(\s*\n?\s*req\.params\.id,\s*\n?\s*String\(paymentId\)/,
    );
  });

  it("confirmarPagoOrdenRetorno valida comprador y consulta MP", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(src, /confirmarPagoOrdenRetorno/);
    assert.match(src, /No tenés permiso para confirmar el pago de esta orden/);
    assert.match(src, /validarPagoMercadoPagoAprobado/);
    assert.match(src, /externalReferenceEsperada: ordenId/);
    assert.match(src, /montoEsperado/);
  });

  it("crearPreferenciaMercadoPago no confirma órdenes con mock", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /mock-mp-\$\{Date\.now\(\)\}/);
    assert.doesNotMatch(src, /mockConfirmed: true/);
  });
});