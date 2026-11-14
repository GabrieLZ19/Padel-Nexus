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

  it("migración corrige backfill FINAL por orden de instancias", () => {
    const sql = readFileSync(
      path.join(
        REPO,
        "supabase/migrations/20261113230000_pub16_corregir_historial_ronda.sql",
      ),
      "utf8",
    );
    assert.match(sql, /emparejados/);
    assert.match(sql, /ambiguo/);
    assert.match(sql, /puntos_zona/);
    assert.match(sql, /ORDER BY fase_zona, fase_llave, orden ASC/);
  });

  it("enriquecimiento runtime prioriza instancia temprana en empate", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "api/src/utils/historialRankingRonda.ts"),
      "utf8",
    );
    assert.match(fuente, /deltaTiempo \* 1e6 \+ orden/);
  });

  it("API expone ronda al listar historial", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "api/src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(fuente, /historial_ranking[\s\S]{0,120}ronda/);
    assert.match(fuente, /enriquecerHistorialConRonda/);
  });
});
