import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFapBracketForPairCount } from "../src/utils/fapBracketMatrices";
import {
  corregirAltaEnPaseDirecto,
  entryMatchForLeafSeed,
  planificarMaterializacionByeConSemilla,
  planificarMaterializacionByeFap,
} from "../src/utils/fapByeMaterializacion";

describe("TOR-22 / TOR-28 materializar rival en pase directo", () => {
  it("localiza el octavo de entrada para 1A", () => {
    const matrix = getFapBracketForPairCount(16);
    assert.ok(matrix);
    const entry = entryMatchForLeafSeed(matrix, "1A");
    assert.ok(entry);
    assert.equal(entry?.matchNo, 57);
    assert.equal(entry?.side, "a");
  });

  it("planifica alta de rival en el mismo partido de entrada (1A vs W50)", () => {
    const matrix = getFapBracketForPairCount(16)!;
    const spec57 = matrix.find((m) => m.matchNo === 57)!;
    const plan = planificarMaterializacionByeFap(
      spec57,
      57,
      matrix,
      "ins-1a",
      null,
      "ins-1a",
      "ins-nueva",
      "b",
    );
    assert.ok(plan);
    assert.equal(plan?.mismoPartidoEntrada, true);
    assert.equal(plan?.inscripcionRival, "ins-nueva");
    assert.equal(plan?.partidoEntradaOrden, 57);
  });

  it("corregirAlta mueve alta del clasificado al hueco W*", () => {
    const spec = { matchNo: 57, a: "1A", b: "W50", winnerTo: 61 };
    const corr = corregirAltaEnPaseDirecto(spec, true, false);
    assert.equal(corr.tieneAltaA, false);
    assert.equal(corr.tieneAltaB, true);
    assert.equal(corr.semillaInferida, "1A");
  });

  it("con semilla explícita limpia avance indebido en partido posterior", () => {
    const matrix = getFapBracketForPairCount(16)!;
    const plan = planificarMaterializacionByeConSemilla(
      "1A",
      61,
      matrix,
      "ins-1a",
      null,
      "ins-1a",
      "ins-nueva",
      "b",
    );
    assert.ok(plan);
    assert.equal(plan?.mismoPartidoEntrada, false);
    assert.equal(plan?.partidoEntradaOrden, 57);
    assert.equal(plan?.ladoDestinoALimpiar, "a");
    assert.equal(plan?.inscripcionRival, "ins-nueva");
  });
});