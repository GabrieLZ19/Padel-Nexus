import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  configuracionPuntosInicial,
  puntosInstanciaEliminatoria,
  type ConfigPuntosTorneo,
} from "../src/utils/rankingTorneo.ts";

type ResultadoLlave = {
  ronda: string;
  ganadorEsA: boolean;
  parejaA: string;
  parejaB: string;
};

/** Réplica la regla TOR-47 (un pago por instancia alcanzada por pareja/jugador). */
function simularPuntosTorneo(
  resultados: ResultadoLlave[],
  cfg: ConfigPuntosTorneo = configuracionPuntosInicial(),
): Map<string, number> {
  const totales = new Map<string, number>();
  for (const r of resultados) {
    const ganador = r.ganadorEsA ? r.parejaA : r.parejaB;
    const perdedor = r.ganadorEsA ? r.parejaB : r.parejaA;
    const pg = puntosInstanciaEliminatoria(r.ronda, true, cfg);
    const pp = puntosInstanciaEliminatoria(r.ronda, false, cfg);
    if (pg > 0) {
      totales.set(ganador, (totales.get(ganador) ?? 0) + pg);
    }
    if (pp > 0) {
      totales.set(perdedor, (totales.get(perdedor) ?? 0) + pp);
    }
  }
  return totales;
}

describe("TOR-47 escenarios del re-test QA 18/11", () => {
  const cfg = configuracionPuntosInicial();

  it("campeón con pase directo a cuartos suma 1000 (no 910 acumulado legacy)", () => {
    const puntos = simularPuntosTorneo([
      { ronda: "CUARTOS", ganadorEsA: true, parejaA: "05/06", parejaB: "x1" },
      { ronda: "SEMIS", ganadorEsA: true, parejaA: "05/06", parejaB: "x2" },
      { ronda: "FINAL", ganadorEsA: true, parejaA: "05/06", parejaB: "x3" },
    ]);
    assert.equal(puntos.get("05/06"), 1000);
    assert.notEqual(puntos.get("05/06"), 910);
  });

  it("finalista con pase directo a cuartos suma 600 al perder la final", () => {
    const puntos = simularPuntosTorneo([
      { ronda: "CUARTOS", ganadorEsA: true, parejaA: "13/14", parejaB: "x1" },
      { ronda: "SEMIS", ganadorEsA: true, parejaA: "13/14", parejaB: "x2" },
      { ronda: "FINAL", ganadorEsA: false, parejaA: "13/14", parejaB: "05/06" },
    ]);
    assert.equal(puntos.get("13/14"), 600);
    assert.notEqual(puntos.get("13/14"), 510);
  });

  it("eliminado en semis tras jugar octavos suma 360", () => {
    const puntos = simularPuntosTorneo([
      { ronda: "OCTAVOS", ganadorEsA: true, parejaA: "11/12", parejaB: "x0" },
      { ronda: "CUARTOS", ganadorEsA: true, parejaA: "11/12", parejaB: "x1" },
      { ronda: "SEMIS", ganadorEsA: false, parejaA: "11/12", parejaB: "05/06" },
    ]);
    assert.equal(puntos.get("11/12"), 360);
    assert.notEqual(puntos.get("11/12"), 180);
  });

  it("pase directo a semis que pierde en semis suma 360 (no 90)", () => {
    const puntos = simularPuntosTorneo([
      {
        ronda: "SEMIS",
        ganadorEsA: false,
        parejaA: "03/04",
        parejaB: "05/06",
      },
    ]);
    assert.equal(puntos.get("03/04"), 360);
  });

  it("pase directo a cuartos que pierde en cuartos suma 180 (no 0)", () => {
    const puntos = simularPuntosTorneo([
      {
        ronda: "CUARTOS",
        ganadorEsA: false,
        parejaA: "07/08",
        parejaB: "05/06",
      },
    ]);
    assert.equal(puntos.get("07/08"), 180);
    assert.equal(puntos.get("07/08") ?? 0, 180);
  });

  it("eliminado en octavos suma 90", () => {
    const puntos = simularPuntosTorneo([
      {
        ronda: "OCTAVOS",
        ganadorEsA: false,
        parejaA: "15/16",
        parejaB: "05/06",
      },
    ]);
    assert.equal(puntos.get("15/16"), 90);
    assert.notEqual(puntos.get("15/16"), 45);
  });
});