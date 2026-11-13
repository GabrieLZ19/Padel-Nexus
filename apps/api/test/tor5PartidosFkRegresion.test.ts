import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ_API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const RAIZ_MONO = path.resolve(RAIZ_API, "../..");

function archivosTsRecursivos(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      out.push(...archivosTsRecursivos(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("TOR-5 regresión FK partidos → torneos", () => {
  it("la migración elimina la FK duplicada partidos_torneo_id_fkey", () => {
    const sql = readFileSync(
      path.join(
        RAIZ_MONO,
        "supabase/migrations/20261113220000_tor5_partidos_fk_torneo_unica.sql",
      ),
      "utf8",
    );
    assert.match(sql, /DROP CONSTRAINT IF EXISTS partidos_torneo_id_fkey/);
    assert.doesNotMatch(sql, /ADD CONSTRAINT partidos_torneo_id_fkey/);
  });

  it("no quedan embeds ambiguos torneos(...) en selects de partidos en el API", () => {
    const srcDir = path.join(RAIZ_API, "src");
    const ambiguos: string[] = [];
    for (const file of archivosTsRecursivos(srcDir)) {
      const rel = path.relative(RAIZ_API, file).replace(/\\/g, "/");
      const content = readFileSync(file, "utf8");
      if (!content.includes('from("partidos")')) continue;
      const bloques = content.split('from("partidos")');
      for (let i = 1; i < bloques.length; i++) {
        const ventana = bloques[i].slice(0, 600);
        const embeds = ventana.match(/torneos\([^!][^)]*\)/g);
        if (embeds?.length) {
          ambiguos.push(`${rel}: ${embeds.join(", ")}`);
        }
      }
    }
    assert.deepEqual(
      ambiguos,
      [],
      `Embeds sin torneos!fk_partidos_torneo: ${ambiguos.join("; ")}`,
    );
  });
});
