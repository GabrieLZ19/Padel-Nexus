import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Suite de regresión Ola 3 — Ranking y sitio público (re-test 24/11).
 * Complementa tests unitarios por ticket; no reemplaza integración manual.
 */
const RAIZ_API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const RAIZ_WEB = path.resolve(RAIZ_API, "../web");

function fuenteApi(rel: string): string {
  return readFileSync(path.join(RAIZ_API, rel), "utf8");
}

function fuenteWeb(rel: string): string {
  return readFileSync(path.join(RAIZ_WEB, rel), "utf8");
}

describe("Ola 3 — checklist ranking público (RNK / TOR-53 / PUB)", () => {
  it("RNK-1: mis-contextos sin embed ambiguo hacia torneos", () => {
    const svc = fuenteApi("src/services/ranking.service.ts");
    assert.match(
      svc,
      /historial_ranking_torneo_id_fkey!inner/,
      "RNK-1",
    );
    assert.match(svc, /torneos!fk_inscripciones_torneo!inner/);
  });

  it("RNK-3: ranking público envía rama Damas/Caballeros", () => {
    const page = fuenteWeb("app/(public)/ranking/page.tsx");
    assert.match(page, /rama:\s*activeRama/);
    assert.match(page, /OPCIONES_RAMA_RANKING_PUBLICO/);
    const ctx = fuenteApi("src/utils/rankingContextoJugador.ts");
    assert.match(ctx, /rama:\s*normalizarRama/);
  });

  it("RNK-2 / TOR-53: scopes Club, Provincial, Nacional y club_id", () => {
    const page = fuenteWeb("app/(public)/ranking/page.tsx");
    assert.match(page, /"Club", "Provincial", "Nacional"/);
    assert.match(page, /club_id:/);
    const svc = fuenteApi("src/services/ranking.service.ts");
    assert.match(svc, /obtenerRankingPorClub/);
    assert.match(svc, /in\("alcance", \["Provincial", "Local"\]\)/);
    const otorgar = fuenteApi("src/utils/otorgarPuntosPartidoTorneo.ts");
    assert.match(otorgar, /alcancePersistidoRankingTorneo/);
  });

  it("PUB-27: panel delega puesto a resolverPosicionEnRanking", () => {
    const panel = fuenteApi("src/services/panelJugador.service.ts");
    assert.match(panel, /RankingService\.resolverPosicionEnRanking/);
    const ranking = fuenteApi("src/services/ranking.service.ts");
    assert.match(ranking, /filtrarFilasRankingPorProvincia/);
  });

  it("PUB-28: rankings y panel excluyen datos QA", () => {
    const ranking = fuenteApi("src/services/ranking.service.ts");
    assert.match(ranking, /esVisibleEnSitioPublico/);
    const panel = fuenteApi("src/services/panelJugador.service.ts");
    assert.match(panel, /esJugadorDePrueba/);
    const dato = fuenteApi("src/utils/datoPrueba.ts");
    assert.match(dato, /esDniPrueba/);
    assert.match(dato, /NOMBRE_QA_RANKING/);
  });
});