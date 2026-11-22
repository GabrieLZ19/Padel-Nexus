import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  configuracionPuntosInicial,
  puntosInstanciaEliminatoria,
} from "../src/utils/rankingTorneo.ts";

describe("TOR-47 puntos por instancia alcanzada", () => {
  const cfg = configuracionPuntosInicial();

  it("campeon y finalista reciben valores absolutos de la tabla", () => {
    assert.equal(puntosInstanciaEliminatoria("FINAL", true, cfg), 1000);
    assert.equal(puntosInstanciaEliminatoria("FINAL", false, cfg), 600);
  });

  it("perdedor en cada ronda recibe el valor de esa instancia (pase directo incluido)", () => {
    assert.equal(puntosInstanciaEliminatoria("SEMIS", false, cfg), 360);
    assert.equal(puntosInstanciaEliminatoria("CUARTOS", false, cfg), 180);
    assert.equal(puntosInstanciaEliminatoria("OCTAVOS", false, cfg), 90);
    assert.equal(puntosInstanciaEliminatoria("16AVOS", false, cfg), 45);
  });

  it("ganador que avanza no suma puntos hasta la final", () => {
    assert.equal(puntosInstanciaEliminatoria("SEMIS", true, cfg), 0);
    assert.equal(puntosInstanciaEliminatoria("CUARTOS", true, cfg), 0);
    assert.equal(puntosInstanciaEliminatoria("OCTAVOS", true, cfg), 0);
  });

  it("no aplica delta contra ronda anterior (caso QA campeon con bye a cuartos)", () => {
    const acumuladoLegacy = 90 + 180 + 640;
    assert.notEqual(acumuladoLegacy, 1000);
    assert.equal(puntosInstanciaEliminatoria("FINAL", true, cfg), 1000);
    assert.equal(puntosInstanciaEliminatoria("CUARTOS", false, cfg), 180);
  });
});