import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ_API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("RNK-1 mis-contextos: embeds PostgREST sin ambigüedad", () => {
  it("listarContextosRankingJugador usa FK explícita hacia torneos", () => {
    const svc = readFileSync(
      path.join(RAIZ_API, "src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(
      svc,
      /from\("historial_ranking"\)[\s\S]{0,400}torneos!historial_ranking_torneo_id_fkey!inner/,
      "historial_ranking tiene dos FK a torneos; el embed debe nombrar historial_ranking_torneo_id_fkey",
    );
    assert.match(
      svc,
      /from\("inscripciones"\)[\s\S]{0,400}torneos!fk_inscripciones_torneo!inner/,
    );
    const bloque = svc.match(
      /static async listarContextosRankingJugador[\s\S]*?^  \}/m,
    )?.[0];
    assert.ok(bloque, "debe existir listarContextosRankingJugador");
    assert.doesNotMatch(
      bloque,
      /from\("historial_ranking"\)[\s\S]{0,220}torneos!inner\s*\(/,
    );
  });
});