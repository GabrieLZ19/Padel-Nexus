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

  it("al cargar resultado delega puntos con puntos_activados", () => {
    const svc = fuente("apps/api/src/services/torneo.service.ts");
    assert.match(svc, /otorgarPuntosPorPartidoRanking/);
    assert.match(svc, /tablaPuntosDesdeConfig/);
    const otorgar = fuente("apps/api/src/utils/otorgarPuntosPartidoTorneo.ts");
    assert.match(otorgar, /alcance: alcanceRanking/);
    assert.match(otorgar, /provincia_jurisdiccion: provinciaJurisdiccion/);
    assert.match(otorgar, /rondaNormalizada\.startsWith\("ZONA"\)/);
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
    assert.match(
      dato,
      /if \(esEmailPlaceholderPlanilla\(email\)\) return false/,
    );
  });

  it("perfil de jugador expone posicion_actual sin query params", () => {
    const ranking = fuente("apps/api/src/services/ranking.service.ts");
    assert.match(ranking, /resolverPosicionEnRanking/);
    assert.match(ranking, /posicion_actual/);
    const ficha = fuente("apps/web/components/jugador/JugadorPublicoRankingSection.tsx");
    assert.match(ficha, /Ranking del club/);
    const pagina = fuente("apps/web/app/(public)/jugadores/[id]/page.tsx");
    assert.match(pagina, /posicionResuelta/);
  });
});
