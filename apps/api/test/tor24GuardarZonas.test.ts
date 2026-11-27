import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { getFapBracketForPairCount } from "../src/utils/fapBracketMatrices";
import {
  buildQualifiedMap,
  proyectarSincronizacionHojasFap,
} from "../src/utils/fapBracketPlacement";
import { zonePosKey } from "../src/utils/fapBracketTypes";
import type { QualifiedPair } from "../src/utils/fapBracketTypes";
import {
  buildValidLeafSeedRefs,
  buildZonePairCountsByLetter,
  isSeedRefValidForZoneComposition,
  listSemillasPendientesFap,
} from "../src/utils/fapZoneSeeds";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function gruposCasoCincoZonas() {
  return [
    {
      nombre_grupo: "Zona A",
      grupo_parejas: [{}, {}, {}, {}] as { inscripcion_id: string }[],
    },
  {
      nombre_grupo: "Zona B",
      grupo_parejas: [{}, {}],
    },
    {
      nombre_grupo: "Zona C",
      grupo_parejas: [{}, {}, {}],
    },
    {
      nombre_grupo: "Zona D",
      grupo_parejas: [{}, {}, {}],
    },
    {
      nombre_grupo: "Zona E",
      grupo_parejas: [{}, {}, {}, {}],
    },
  ];
}

function qualifiedCasoCincoZonas(): QualifiedPair[] {
  return [
    { pairId: "ins-1a", zone: "A", qualificationPosition: 1, rankingScore: 6 },
    { pairId: "ins-2a", zone: "A", qualificationPosition: 2, rankingScore: 5 },
    { pairId: "ins-3a", zone: "A", qualificationPosition: 3, rankingScore: 4 },
    { pairId: "ins-1b", zone: "B", qualificationPosition: 1, rankingScore: 3 },
    { pairId: "ins-1c", zone: "C", qualificationPosition: 1, rankingScore: 3 },
    { pairId: "ins-2c", zone: "C", qualificationPosition: 2, rankingScore: 2 },
    { pairId: "ins-1d", zone: "D", qualificationPosition: 1, rankingScore: 3 },
    { pairId: "ins-2d", zone: "D", qualificationPosition: 2, rankingScore: 2 },
    { pairId: "ins-1e", zone: "E", qualificationPosition: 1, rankingScore: 6 },
    { pairId: "ins-2e", zone: "E", qualificationPosition: 2, rankingScore: 5 },
    { pairId: "ins-3e", zone: "E", qualificationPosition: 3, rankingScore: 4 },
    { pairId: "ins-viejo-2b", zone: "B", qualificationPosition: 2, rankingScore: 0 },
  ];
}

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

  it("A:4 B:2 C:3 D:3 E:4 — quita 2B de la llave y asigna 2E (16 parejas)", () => {
    const matrix = getFapBracketForPairCount(16);
    assert.ok(matrix?.length);
    const grupos = gruposCasoCincoZonas();
    const counts = buildZonePairCountsByLetter(grupos);
    const qualifiedMap = buildQualifiedMap(qualifiedCasoCincoZonas());

    assert.equal(isSeedRefValidForZoneComposition("2B", counts), false);
    assert.equal(isSeedRefValidForZoneComposition("2E", counts), true);
    assert.ok(buildValidLeafSeedRefs(counts).has(zonePosKey("E", 3)));

    const partidos = matrix!.map((m) => ({
      orden: m.matchNo,
      equipo_a_id:
        m.a === "2B"
          ? "ins-viejo-2b"
          : m.a === "2E"
            ? null
            : m.a === "1A"
              ? "ins-1a"
              : null,
      equipo_b_id:
        m.b === "2B"
          ? "ins-viejo-2b"
          : m.b === "2C"
            ? "ins-2c"
            : null,
    }));

    const proyeccion = proyectarSincronizacionHojasFap(
      matrix!,
      counts,
      qualifiedMap,
      partidos,
    );

    assert.ok(proyeccion.semillas_invalidadas.includes("2B"));
    assert.ok(proyeccion.semillas_actualizadas.includes("2E"));

    const m50 = proyeccion.actualizaciones.find((u) => u.matchNo === 50);
    assert.ok(m50);
    assert.equal(m50.equipo_a_id, null);

    const m54 = proyeccion.actualizaciones.find((u) => u.matchNo === 54);
    assert.ok(m54);
    assert.equal(m54.equipo_b_id, "ins-2e");

    const pendientes = listSemillasPendientesFap(
      ["1A", "2B", "2E", "3A"],
      qualifiedMap,
      counts,
    );
    assert.ok(!pendientes.includes("2B"));
  });

  it("competencia.service: regenera solo zonas que cambian y sincroniza llave", () => {
    const svc = readFileSync(
      path.join(RAIZ, "api/src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /firmaPorGrupoAntes/);
    assert.match(svc, /firmaAnterior !== undefined && firmaAnterior === firmaNueva/);
    assert.match(svc, /postProcesoTrasCambioZonas/);
    assert.match(svc, /Pendiente Ganadores/);
    assert.match(svc, /ordenesTrasBorrarPendientes/);
    assert.match(svc, /repararFixtureZonasTorneo/);
    const post = readFileSync(
      path.join(RAIZ, "api/src/utils/zonaPostCambio.ts"),
      "utf8",
    );
    assert.match(post, /sincronizarLlaveTrasCambioZonas/);
    assert.match(post, /completarPartidosFaltantesTorneo/);
    assert.match(post, /aplicarDesprogramacionZonaTrasCambioTorneo/);
    assert.match(post, /programarPartidosZonaPendientes/);
    assert.match(post, /contarPartidosZonaSinHorario/);
  });

  it("moverPareja usa el mismo post-proceso que guardarZonas", () => {
    const svc = readFileSync(
      path.join(RAIZ, "api/src/services/competencia.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(svc.indexOf("static async moverPareja"));
    assert.match(bloque, /postProcesoTrasCambioZonas/);
    assert.match(bloque, /partidos_sin_horario/);
    assert.doesNotMatch(
      bloque.slice(0, bloque.indexOf("postProcesoTrasCambioZonas")),
      /sincronizarLlaveTrasCambioZonas/,
    );
  });

  it("playoffAvance invalida semillas de hoja segun tamano de zona", () => {
    const src = readFileSync(
      path.join(RAIZ, "api/src/utils/playoffAvance.ts"),
      "utf8",
    );
    assert.match(src, /proyectarSincronizacionHojasFap/);
    assert.match(src, /sincronizarLlaveTrasCambioZonas/);
    assert.match(src, /zonasCompletas\.get\(g\.nombre_grupo\)/);
    assert.match(
      src,
      /partido\.ganador[\s\S]*FINALIZADO[\s\S]*continue/,
    );
  });

  it("guardarZonas registra resumen de llave en auditoria", () => {
    const svc = readFileSync(
      path.join(RAIZ, "api/src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /llave_sincronizada:\s*llave/);
  });

  it("zona E con 4 parejas habilita 3E; zona B con 2 no admite 2B", () => {
    const counts = buildZonePairCountsByLetter([
      {
        nombre_grupo: "Zona B",
        grupo_parejas: [{}, {}],
      },
      {
        nombre_grupo: "Zona E",
        grupo_parejas: [{}, {}, {}, {}] as { inscripcion_id: string }[],
      },
    ]);
    assert.equal(isSeedRefValidForZoneComposition("3E", counts), true);
    assert.equal(isSeedRefValidForZoneComposition("2B", counts), false);
    const seeds = buildValidLeafSeedRefs(counts);
    assert.ok(seeds.has("3E"));
    assert.ok(!seeds.has("2B"));
  });
});