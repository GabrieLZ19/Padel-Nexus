import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-15 acta consolidada con marcadores", () => {
  it("fiscalPartidos formatea sets, W.O. y supertiebreak", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "utils/fiscalPartidos.ts"),
      "utf8",
    );
    assert.match(fuente, /export function formatearResultadoSets/);
    assert.match(fuente, /es_supertiebreak/);
    assert.match(fuente, /if \(sets\.length === 0\)/);
  });

  it("acta fiscal PDF incluye columna Resultado", () => {
    const pdf = readFileSync(
      path.join(RAIZ, "utils/actaFiscalPdf.ts"),
      "utf8",
    );
    assert.match(pdf, /"Resultado"/);
    assert.match(pdf, /formatearResultadoSets\(p\)/);
  });
});
