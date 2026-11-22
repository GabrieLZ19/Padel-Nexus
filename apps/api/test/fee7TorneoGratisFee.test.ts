import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-7 fee en torneos gratuitos (manual/planilla)", () => {
  it("inscripción manual confirmada registra fee aunque monto sea 0", () => {
    const src = readFileSync(`${root}src/services/inscripcion.service.ts`, "utf8");
    const bloque = src.match(
      /estadoPago === FAP_ESTADOS_PAGO\.CONFIRMADO[\s\S]{0,220}registrarFeeInscripcionOffPlatform/,
    )?.[0];
    assert.ok(bloque, "Bloque manual confirmado");
    assert.doesNotMatch(bloque!, /montoInscripcion\s*>\s*0/);
  });

  it("pago manual confirma fee sin exigir monto > 0", () => {
    const src = readFileSync(`${root}src/services/pago.service.ts`, "utf8");
    assert.match(
      src,
      /entidadTipo === "inscripcion"[\s\S]*registrarFeeInscripcionOffPlatform/,
    );
    assert.doesNotMatch(
      src,
      /entidadTipo === "inscripcion" && datos\.monto > 0/,
    );
  });

  it("calcularMontoFee: fijo no depende del bruto", () => {
    const src = readFileSync(`${root}src/services/platformFee.service.ts`, "utf8");
    const fn = src.match(/static calcularMontoFee[\s\S]*?^  \}/m)?.[0];
    assert.ok(fn);
    assert.match(fn!, /config\.tipo === "fijo"/);
    const fijoAntesPct = fn!.split('config.tipo === "fijo"')[0];
    assert.doesNotMatch(fijoAntesPct, /montoBruto <= 0/);
  });
});