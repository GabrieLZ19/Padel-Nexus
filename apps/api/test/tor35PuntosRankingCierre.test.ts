import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  configuracionPuntosInicial,
  inferirPuntosActivados,
  torneoVinculaRanking,
} from "../src/utils/rankingTorneo.ts";
import { ordenarPartidosParaRecalculoPuntos } from "../src/utils/otorgarPuntosPartidoTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-35 puntos de ranking al cierre", () => {
  it("ranking vinculado activa puntos por defecto si no hay config explícita", () => {
    assert.equal(inferirPuntosActivados(null, "Provincial"), true);
    assert.equal(inferirPuntosActivados({}, "Local"), true);
    assert.equal(
      inferirPuntosActivados({ puntos_activados: false }, "Local"),
      false,
    );
    assert.equal(torneoVinculaRanking("Clasificatorio"), false);
  });

  it("configuracionPuntosInicial trae puntos_activados true", () => {
    const cfg = configuracionPuntosInicial();
    assert.equal(cfg.puntos_activados, true);
    assert.ok((cfg.puntos_campeon ?? 0) > 0);
  });

  it("ordenarPartidosParaRecalculoPuntos prioriza zonas y luego llave", () => {
    const ordenados = ordenarPartidosParaRecalculoPuntos([
      { id: "1", ronda: "FINAL", orden: 1 },
      { id: "2", ronda: "Zona A", orden: 1 },
      { id: "3", ronda: "OCTAVOS", orden: 2 },
    ]);
    assert.deepEqual(
      ordenados.map((p) => p.ronda),
      ["Zona A", "OCTAVOS", "FINAL"],
    );
  });

  it("crear torneo persiste configuracion_puntos inicial", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(svc, /configuracion_puntos: configuracionPuntosInicial\(\)/);
    assert.match(svc, /avisos_ranking/);
    assert.match(svc, /activarPuntosRankingPostCierre/);
  });

  it("expone POST activar-puntos-ranking con motivo", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(routes, /activar-puntos-ranking/);
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /activarPuntosRankingPostCierre/);
  });
});
