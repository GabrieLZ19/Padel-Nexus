import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFapBracketForPairCount } from "../src/utils/fapBracketMatrices";
import { resolverMatchNoFap } from "../src/utils/fapVinculoPartidos";

describe("fapVinculoPartidos", () => {
  it("resuelve matchNo por ronda cuando orden no coincide", () => {
    const matrix = getFapBracketForPairCount(16)!;
    const matchNos = matrix.map((m) => m.matchNo);
    const playoff = [
      { id: "q0", ronda: "CUARTOS", orden: 100 },
      { id: "q1", ronda: "CUARTOS", orden: 101 },
    ];
    const no = resolverMatchNoFap("q0", 100, matrix, playoff);
    assert.equal(no, matchNos.find((n) => n >= 57 && n <= 60) ?? no);
    assert.equal(no, 57);
  });
});