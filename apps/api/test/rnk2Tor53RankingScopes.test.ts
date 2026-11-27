import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  acumularPuntosHistorialPorUsuario,
  alcancePersistidoRankingTorneo,
} from "../src/utils/rankingPorClub.ts";

const RAIZ_API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("RNK-2 / TOR-53 ranking Club y visibilidad provincial", () => {
  it("torneos Local nuevos persisten alcance Local (TOR-53)", () => {
    assert.equal(alcancePersistidoRankingTorneo("Local"), "Local");
    assert.equal(
      alcancePersistidoRankingTorneo("Local", "Provincial"),
      "Provincial",
    );
    assert.equal(alcancePersistidoRankingTorneo("Provincial"), "Provincial");
  });

  it("acumula puntos del club por historial", () => {
    const mapa = acumularPuntosHistorialPorUsuario([
      { usuario_id: "u1", puntos_anteriores: 100, puntos_nuevos: 190 },
      { usuario_id: "u1", puntos_anteriores: 190, puntos_nuevos: 190 },
      { usuario_id: "u2", puntos_anteriores: 0, puntos_nuevos: 45 },
    ]);
    assert.equal(mapa.get("u1"), 90);
    assert.equal(mapa.get("u2"), 45);
  });

  it("obtenerRankingGlobal incluye Local en scope Provincial y expone ranking Club", () => {
    const svc = readFileSync(
      path.join(RAIZ_API, "src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(svc, /alcanceNorm === "Club"/);
    assert.match(svc, /obtenerRankingPorClub/);
    assert.match(svc, /in\("alcance", \["Provincial", "Local"\]\)/);
    assert.match(svc, /listarClubesRankingJugador/);
    assert.match(svc, /listarClubesConRankingPublico/);
    assert.match(svc, /esClubActivoPublico/);
    assert.match(svc, /esClubDePrueba/);
    const otorgar = readFileSync(
      path.join(RAIZ_API, "src/utils/otorgarPuntosPartidoTorneo.ts"),
      "utf8",
    );
    assert.match(otorgar, /alcancePersistidoRankingTorneo/);
  });
});