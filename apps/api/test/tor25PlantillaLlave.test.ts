import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  getFapBracketForPairCount,
  inferFapPlantillaPairCountFromOrdens,
} from "../src/utils/fapBracketMatrices";

describe("TOR-25 plantilla FAP fija con altas en llave", () => {
  it("infiere 16 aunque haya más inscripciones si la llave sigue siendo de 16", () => {
    const matrix16 = getFapBracketForPairCount(16);
    assert.ok(matrix16);
  const ordens = matrix16.map((m) => m.matchNo);
    const inferido = inferFapPlantillaPairCountFromOrdens(ordens);
    assert.equal(inferido, 16);
  });

  it("18 no coincide con ordens de plantilla 16", () => {
    const matrix16 = getFapBracketForPairCount(16);
    assert.ok(matrix16);
    const ordens16 = matrix16.map((m) => m.matchNo);
    const matrix18 = getFapBracketForPairCount(18);
    assert.ok(matrix18);
    const ordens18 = matrix18.map((m) => m.matchNo);
    assert.notDeepEqual(ordens16, ordens18);
    assert.equal(inferFapPlantillaPairCountFromOrdens(ordens16), 16);
    assert.ok(inferFapPlantillaPairCountFromOrdens(ordens18)! >= 18);
  });

  it("getLlaveMatriz usa resolveFapPlantillaPairCount", () => {
    const raiz = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const ctrl = readFileSync(
      path.join(raiz, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /resolveFapPlantillaPairCount/);
    assert.match(ctrl, /inscripcionesConfirmadas/);
  });
});
