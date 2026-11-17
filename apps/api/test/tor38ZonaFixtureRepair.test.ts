import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  idsPartidosDuplicadosPendientes,
  pairKeyPartidoZona,
} from "../src/utils/zonaFixtureRepair.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-38 fixture de zonas sin duplicar cruces", () => {
  it("pairKeyPartidoZona es simétrico", () => {
    assert.equal(
      pairKeyPartidoZona("ins-a", "ins-b"),
      pairKeyPartidoZona("ins-b", "ins-a"),
    );
  });

  it("idsPartidosDuplicadosPendientes conserva el partido con horario o menor orden", () => {
    const ids = idsPartidosDuplicadosPendientes([
      {
        id: "viejo-9",
        orden: 9,
        equipo_a_id: "p13",
        equipo_b_id: "p17",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-16T18:00:00Z",
      },
      {
        id: "dup-1",
        orden: 1,
        equipo_a_id: "p13",
        equipo_b_id: "p17",
      },
    ]);
    assert.deepEqual(ids, ["dup-1"]);
  });

  it("elimina el pendiente duplicado y conserva el partido con resultado", () => {
    const ids = idsPartidosDuplicadosPendientes([
      {
        id: "j1",
        orden: 1,
        equipo_a_id: "p1",
        equipo_b_id: "p2",
        ganador: "p1",
      },
      {
        id: "p2",
        orden: 8,
        equipo_a_id: "p1",
        equipo_b_id: "p2",
      },
    ]);
    assert.deepEqual(ids, ["p2"]);
  });

  it("completarPartidosFaltantesTorneo acepta solo zonas regeneradas", () => {
    const repair = readFileSync(
      path.join(RAIZ, "src/utils/zonaFixtureRepair.ts"),
      "utf8",
    );
    assert.match(repair, /soloNombresGrupo\?: string\[\]/);
    assert.match(repair, /pairsPresentes\.has\(pk\)/);
    assert.match(repair, /deduplicarPartidosPendientesTorneo/);
  });

  it("generarFaseGrupos numera orden por zona (1..N), no global", () => {
    const competencia = readFileSync(
      path.join(RAIZ, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(competencia, /let ordenEnZona = 1/);
    assert.doesNotMatch(competencia, /correlativoZona/);
    assert.match(competencia, /deduplicarPartidosPendientesTorneo/);
    assert.match(
      competencia,
      /completarPartidosFaltantesTorneo\(torneoId, zonasRegeneradas\)/,
    );
  });
});