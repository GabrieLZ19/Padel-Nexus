import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REPO = path.resolve(RAIZ, "..");

describe("PUB-16 historial ranking — ronda", () => {
  it("migración agrega columna ronda", () => {
    const sql = readFileSync(
      path.join(
        REPO,
        "supabase/migrations/20261112160000_pub16_historial_ranking_ronda.sql",
      ),
      "utf8",
    );
    assert.match(sql, /historial_ranking/);
    assert.match(sql, /ronda/);
  });

  it("cierre de partido persiste ronda en historial", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "api/src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(fuente, /ronda:\s*partido\.ronda/);
  });

  it("API expone ronda al listar historial", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "api/src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(fuente, /historial_ranking[\s\S]{0,120}ronda/);
  });
});
