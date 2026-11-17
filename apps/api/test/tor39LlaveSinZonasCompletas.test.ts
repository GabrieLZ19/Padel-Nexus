import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildQualifiedMap,
  fillLeafSidesFromQualified,
} from "../src/utils/fapBracketPlacement";
import { getFapBracketForPairCount } from "../src/utils/fapBracketMatrices";
import { zonaFixtureCompleto } from "../src/utils/playoffAvance";
import {
  buildZonePairCountsByLetter,
  equipoEnSlotDesdeClasificado,
  listSemillasPendientesFap,
} from "../src/utils/fapZoneSeeds";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("TOR-39 llave sin clasificar antes de cerrar zonas", () => {
  it("zonaFixtureCompleto exige partidos jugados", () => {
    assert.equal(zonaFixtureCompleto([]), false);
    assert.equal(
      zonaFixtureCompleto([
        { equipo_a_id: "a", equipo_b_id: "b", ganador: null },
      ]),
      false,
    );
    assert.equal(
      zonaFixtureCompleto([
        { equipo_a_id: "a", equipo_b_id: "b", ganador: "a" },
      ]),
      true,
    );
  });

  it("no asigna clasificados de zona sin cerrar (solo 1º A en mapa)", () => {
    const matrix = getFapBracketForPairCount(16);
    assert.ok(matrix?.length);

    const grupos = [
      {
        nombre_grupo: "Zona A",
        grupo_parejas: [{ inscripcion_id: "a1" }, { inscripcion_id: "a2" }],
      },
      {
        nombre_grupo: "Zona B",
        grupo_parejas: [{ inscripcion_id: "b1" }, { inscripcion_id: "b2" }],
      },
    ];
    const countsByZone = buildZonePairCountsByLetter(grupos);

    const qualified = buildQualifiedMap([
      {
        pairId: "insc-1a",
        zone: "A",
        qualificationPosition: 1,
        rankingScore: 4,
      },
    ]);
    const fills = fillLeafSidesFromQualified(matrix!, qualified);

    for (const fill of fills) {
      const m = matrix!.find((x) => x.matchNo === fill.matchNo);
      if (!m) continue;
      const equipoA = equipoEnSlotDesdeClasificado(
        m.a,
        fill.equipo_a_id,
        countsByZone,
        null,
      );
      const equipoB = equipoEnSlotDesdeClasificado(
        m.b,
        fill.equipo_b_id,
        countsByZone,
        null,
      );

      const refB = (ref: string) => parseSeedRefZone(ref) === "B";
      if (refB(m.a)) assert.equal(equipoA, null);
      if (refB(m.b)) assert.equal(equipoB, null);

      const refA = (ref: string) => parseSeedRefZone(ref) === "A";
      if (m.a === "1A") assert.equal(equipoA, "insc-1a");
      if (m.b === "1A") assert.equal(equipoB, "insc-1a");
    }
  });

  it("playoffAvance: solo clasifica zonas completas y sync zonas no programa llave", () => {
    const src = readFileSync(
      path.join(RAIZ, "api/src/utils/playoffAvance.ts"),
      "utf8",
    );
    assert.match(src, /mapZonasGrupalesCompletas/);
    assert.match(src, /if \(!zonasCompletas\.get\(g\.nombre_grupo\)\)/);
    assert.match(
      src,
      /sincronizarLlaveTrasCambioZonas[\s\S]*programarLlavePendiente:\s*false/,
    );
    assert.match(
      src,
      /sincronizarLlaveTrasCambioZonas[\s\S]*marcarPartidosProgramados:\s*false/,
    );
  });
});

describe("TOR-24 plazas FAP segun tamano de zona", () => {
  it("2B no figura como pendiente si la zona B tiene 2 parejas", () => {
    const counts = new Map([
      ["A", 4],
      ["B", 2],
    ]);
    const qualified = buildQualifiedMap([
      {
        pairId: "x",
        zone: "A",
        qualificationPosition: 1,
        rankingScore: 0,
      },
    ]);
    const pendientes = listSemillasPendientesFap(
      ["1A", "2A", "3A", "1B", "2B", "1C"],
      qualified,
      counts,
    );
    assert.ok(!pendientes.includes("2B"));
    assert.ok(pendientes.includes("1B"));
  });

  it("zona E de 4 habilita 3E", () => {
    const counts = new Map([["E", 4]]);
    assert.equal(
      listSemillasPendientesFap(["3E"], new Map(), counts).includes("3E"),
      true,
    );
    const counts2 = new Map([["E", 3]]);
    assert.equal(
      listSemillasPendientesFap(["3E"], new Map(), counts2).includes("3E"),
      false,
    );
  });
});

function parseSeedRefZone(ref: string): string | null {
  const m = /^([123])([A-L])$/i.exec(ref);
  return m ? m[2].toUpperCase() : null;
}