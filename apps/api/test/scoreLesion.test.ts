import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { completarScorePorLesion } from "../src/utils/scoreLesion";

describe("completarScorePorLesion - Abandono por lesión", () => {
  it("ejemplo de la auditoría: pareja A ganaba 6-2 y 3-1, se retira pareja A", () => {
    const res = completarScorePorLesion({
      s1A: 6,
      s1B: 2,
      s2A: 3,
      s2B: 1,
      s3A: null,
      s3B: null,
      retiraLado: "A",
      esTercerSetCompleto: true,
    });

    assert.equal(res.set1_a, 6);
    assert.equal(res.set1_b, 2);
    assert.equal(res.set2_a, 3);
    assert.equal(res.set2_b, 6);
    assert.equal(res.set3_a, 0);
    assert.equal(res.set3_b, 6);
    assert.equal(res.ganadorLado, "B");
  });

  it("pareja A ganaba 6-2 y 3-1, se retira pareja B", () => {
    const res = completarScorePorLesion({
      s1A: 6,
      s1B: 2,
      s2A: 3,
      s2B: 1,
      s3A: null,
      s3B: null,
      retiraLado: "B",
      esTercerSetCompleto: true,
    });

    assert.equal(res.set1_a, 6);
    assert.equal(res.set1_b, 2);
    assert.equal(res.set2_a, 6);
    assert.equal(res.set2_b, 1);
    assert.equal(res.set3_a, null);
    assert.equal(res.set3_b, null);
    assert.equal(res.ganadorLado, "A");
  });

  it("retiro durante el set 1: pareja A ganaba 2-1 y se retira A", () => {
    const res = completarScorePorLesion({
      s1A: 2,
      s1B: 1,
      retiraLado: "A",
    });

    assert.equal(res.set1_a, 2);
    assert.equal(res.set1_b, 6);
    assert.equal(res.set2_a, 0);
    assert.equal(res.set2_b, 6);
    assert.equal(res.set3_a, null);
    assert.equal(res.set3_b, null);
    assert.equal(res.ganadorLado, "B");
  });

  it("retiro en set 3 con super tie-break: 6-4, 4-6 y se retira B en el set 3", () => {
    const res = completarScorePorLesion({
      s1A: 6,
      s1B: 4,
      s2A: 4,
      s2B: 6,
      s3A: 2,
      s3B: 3,
      retiraLado: "B",
      esTercerSetCompleto: false,
      stbPuntosTarget: 10,
    });

    assert.equal(res.set1_a, 6);
    assert.equal(res.set1_b, 4);
    assert.equal(res.set2_a, 4);
    assert.equal(res.set2_b, 6);
    assert.equal(res.set3_a, 10);
    assert.equal(res.set3_b, 3);
    assert.equal(res.ganadorLado, "A");
  });

  it("idempotencia: pasar un marcador ya completado no lo modifica", () => {
    const res = completarScorePorLesion({
      s1A: 6,
      s1B: 2,
      s2A: 3,
      s2B: 6,
      s3A: 0,
      s3B: 6,
      retiraLado: "A",
      esTercerSetCompleto: true,
    });

    assert.equal(res.set1_a, 6);
    assert.equal(res.set1_b, 2);
    assert.equal(res.set2_a, 3);
    assert.equal(res.set2_b, 6);
    assert.equal(res.set3_a, 0);
    assert.equal(res.set3_b, 6);
    assert.equal(res.ganadorLado, "B");
  });
});
