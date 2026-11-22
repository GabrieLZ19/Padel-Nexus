import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { paymentIdMercadoPagoValido } from "../src/utils/validarPagoMercadoPago.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-2 confirmar-retorno licencia valida pago en MP", () => {
  it("paymentIdMercadoPagoValido rechaza ids inventados", () => {
    assert.equal(paymentIdMercadoPagoValido("1234567890"), true);
    assert.equal(paymentIdMercadoPagoValido("mobile-licencia-1"), false);
    assert.equal(paymentIdMercadoPagoValido(""), false);
  });

  it("licencia.controller exige payment_id y consulta MP antes de confirmar", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/controllers/licencia.controller.ts"),
      "utf8",
    );
    assert.match(src, /Se requiere el payment_id de Mercado Pago/);
    assert.match(src, /confirmarPagoLicenciaRetorno/);
    assert.doesNotMatch(
      src,
      /mobile-licencia-\$\{Date\.now\(\)\}/,
    );
  });

  it("confirmarPagoLicencia y confirmarPagoLicenciaRetorno validan payment_id", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(src, /paymentIdMercadoPagoValido/);
    assert.match(src, /validarPagoMercadoPagoAprobado/);
    assert.match(src, /externalReferenceEsperada: `licencia:\$\{licenciaId\}`/);
  });

  it("validarPagoMercadoPago documenta chequeos de estado, referencia y monto", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/utils/validarPagoMercadoPago.ts"),
      "utf8",
    );
    assert.match(src, /status !== "approved"/);
    assert.match(src, /external_reference/);
    assert.match(src, /transaction_amount/);
    assert.match(src, /No se encontró el pago en Mercado Pago/);
  });
});