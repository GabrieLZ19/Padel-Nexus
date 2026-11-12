import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  alcanceRankingDesdeTorneo,
  tablaPuntosDesdeConfig,
} from "../src/utils/rankingTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("TOR-6 puntos de torneo club en ranking local", () => {
  it("mapea torneos Local/Privado al alcance Local del ranking", () => {
    assert.equal(alcanceRankingDesdeTorneo("Local"), "Local");
    assert.equal(alcanceRankingDesdeTorneo("Privado"), "Local");
    assert.equal(alcanceRankingDesdeTorneo("Provincial"), "Provincial");
  });

  it("no otorga puntos si el cierre tiene puntos desactivados", () => {
    assert.equal(tablaPuntosDesdeConfig({ puntos_activados: false }), null);
    assert.equal(tablaPuntosDesdeConfig(null), null);
  });

  it("usa la tabla del Paso Cierre cuando los puntos están activados", () => {
    const tabla = tablaPuntosDesdeConfig({
      puntos_activados: true,
      puntos_campeon: 500,
      puntos_final: 300,
      puntos_zona: 25,
    });
    assert.ok(tabla);
    assert.equal(tabla!.FINAL.ganador, 500);
    assert.equal(tabla!["16AVOS"].perdedor, 25);
  });

  it("al cargar resultado persiste alcance en rankings y exige puntos_activados", () => {
    const svc = fuente("apps/api/src/services/torneo.service.ts");
    assert.match(svc, /tablaPuntosDesdeConfig/);
    assert.match(svc, /alcance: alcanceRanking/);
    assert.match(svc, /provincia_jurisdiccion: provinciaJurisdiccion/);
    assert.match(svc, /rondaNormalizada\.startsWith\("ZONA"\)/);
    assert.doesNotMatch(
      svc,
      /puntos_activados\) \{\s*TABLA_PUNTOS = \{/,
    );
  });

  it("el panel del club consulta ranking con scope Local", () => {
    const rankings = fuente("apps/web/app/dashboard/rankings/page.tsx");
    assert.match(rankings, /rol === "admin_club"[\s\S]*?return "Local"/);
  });

  it("jugadores de planilla entran al ranking público (no son datos de prueba)", () => {
    const dato = fuente("apps/api/src/utils/datoPrueba.ts");
    assert.match(dato, /esEmailPlaceholderPlanilla/);
    const ranking = fuente("apps/api/src/services/ranking.service.ts");
    assert.match(ranking, /ranking_provisional/);
    assert.match(ranking, /torneo_nombre/);
  });
});
