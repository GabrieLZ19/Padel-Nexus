import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  esClubActivoPublico,
  esClubDePrueba,
} from "../src/utils/datoPrueba.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RNK-4 clubes del ranking publico", () => {
  it("excluye clubes inactivos y de prueba", () => {
    assert.equal(esClubActivoPublico({ estado: "Activo" }), true);
    assert.equal(esClubActivoPublico({ estado: "Inactivo" }), false);
    assert.equal(esClubDePrueba({ nombre: "QA Prueba Club" }), true);
    assert.equal(esClubDePrueba({ nombre: "New Center" }), false);
  });

  it("expone GET /rankings/clubes y filtra mis-clubes por estado de club", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/ranking.routes.ts"),
      "utf8",
    );
    assert.match(routes, /\/clubes/);
    assert.match(routes, /listarClubesRankingPublico/);

    const svc = readFileSync(
      path.join(RAIZ, "src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(svc, /idsClubesConRankingPublico/);
    assert.match(svc, /historial_ranking/);
    assert.match(
      svc,
      /listarClubesRankingJugador[\s\S]*esClubActivoPublico/,
    );
  });
});