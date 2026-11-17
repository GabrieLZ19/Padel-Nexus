import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildValidLeafSeedRefs,
  buildZonePairCountsByLetter,
  isSeedRefValidForZoneComposition,
  listSemillasPendientesFap,
} from "../src/utils/fapZoneSeeds";
import { buildQualifiedMap } from "../src/utils/fapBracketPlacement";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("TOR-24 guardar zonas y llave", () => {
  it("semillas_pendientes excluye plazas invalidadas por tamano de zona", () => {
    const counts = new Map([
      ["A", 4],
      ["B", 2],
    ]);
    const pendientes = listSemillasPendientesFap(
      ["1A", "2B", "1B"],
      buildQualifiedMap([]),
      counts,
    );
    assert.ok(pendientes.includes("1B"));
    assert.ok(!pendientes.includes("2B"));
  });

  it("2º B deja de aplicar cuando la zona B tiene 2 parejas", () => {
    const counts = buildZonePairCountsByLetter([
      { nombre_grupo: "Zona A", grupo_parejas: [{}, {}, {}, {}] as { inscripcion_id: string }[] },
      { nombre_grupo: "Zona B", grupo_parejas: [{}, {}] },
      { nombre_grupo: "Zona D", grupo_parejas: [{}, {}, {}, {}] },
    ]);
    assert.equal(isSeedRefValidForZoneComposition("2B", counts), false);
    assert.equal(isSeedRefValidForZoneComposition("1B", counts), true);
    assert.equal(isSeedRefValidForZoneComposition("3D", counts), true);
    const seeds = buildValidLeafSeedRefs(counts);
    assert.ok(!seeds.has("2B"));
    assert.ok(seeds.has("3D"));
  });

  it("competencia.service: regenera solo zonas que cambian y sincroniza llave", () => {
    const svc = readFileSync(
      path.join(RAIZ, "api/src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /firmaPorGrupoAntes/);
    assert.match(svc, /firmaAnterior !== undefined && firmaAnterior === firmaNueva/);
    assert.match(svc, /sincronizarLlaveTrasCambioZonas/);
    assert.match(svc, /Pendiente Ganadores/);
    assert.match(svc, /ordenesTrasBorrarPendientes/);
    assert.match(svc, /completarPartidosFaltantesTorneo/);
    assert.match(svc, /repararFixtureZonasTorneo/);
  });

  it("playoffAvance invalida semillas de hoja segun tamano de zona", () => {
    const src = readFileSync(
      path.join(RAIZ, "api/src/utils/playoffAvance.ts"),
      "utf8",
    );
    assert.match(src, /isSeedRefValidForZoneComposition/);
    assert.match(src, /sincronizarLlaveTrasCambioZonas/);
    assert.match(src, /zonasCompletas\.get\(g\.nombre_grupo\)/);
  });
});
