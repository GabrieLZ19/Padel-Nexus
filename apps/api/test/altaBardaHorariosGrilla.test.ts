import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ_API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const RAIZ_REPO = path.resolve(RAIZ_API, "../..");
const DOCS = path.join(
  RAIZ_REPO,
  "docs/Alta Barda - horarios para cargar",
);

const TORNEOS_ALTA_BARDA = {
  libre5: "10d7ab59-8694-4752-bfb2-8f50e37b34d0",
  damas6: "3a9461a3-84d7-4b0c-bbe3-62a29f4b337e",
  damas7: "956a8d68-f4b4-4202-b0a3-82b129f38c83",
} as const;

function contarPorTorneo(ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

describe("Item 1 — grilla Alta Barda 28-29/11 (artefactos + criterios QA)", () => {
  it("el CSV tiene 82 partidos repartidos 19 / 29 / 34 por torneo", () => {
    const csv = readFileSync(path.join(DOCS, "horarios_alta_barda.csv"), "utf8");
    const lineas = csv.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(lineas.length, 83, "encabezado + 82 filas");

    const filas = lineas.slice(1);
    assert.equal(filas.length, 82);

    const torneoIds = filas.map((l) => l.split(",")[1]?.trim() ?? "");
    const conteo = contarPorTorneo(torneoIds);
    assert.equal(conteo[TORNEOS_ALTA_BARDA.libre5], 19);
    assert.equal(conteo[TORNEOS_ALTA_BARDA.damas6], 29);
    assert.equal(conteo[TORNEOS_ALTA_BARDA.damas7], 34);
  });

  it("el SQL asigna los 82 partidos con horario_bloqueado", () => {
    const sql = readFileSync(
      path.join(DOCS, "horarios_alta_barda.sql"),
      "utf8",
    );
    const updates = sql.match(/^update partidos /gim) ?? [];
    assert.equal(updates.length, 82);
    const conBloqueo =
      sql.match(/horario_bloqueado\s*=\s*true/gi) ?? [];
    assert.equal(conBloqueo.length, 82);
  });

  it("el JSON por torneo coincide con los conteos del CSV", () => {
    const json = JSON.parse(
      readFileSync(path.join(DOCS, "asignar_lote_por_torneo.json"), "utf8"),
    ) as Record<string, unknown[]>;

    assert.equal(json[TORNEOS_ALTA_BARDA.damas7]?.length, 34);
    assert.equal(json[TORNEOS_ALTA_BARDA.damas6]?.length, 29);
    assert.equal(json[TORNEOS_ALTA_BARDA.libre5]?.length, 19);

    const total = Object.values(json).reduce((n, arr) => n + arr.length, 0);
    assert.equal(total, 82);
  });

  it("publicar solo exige horario/cancha y conflictos graves (no re-valida auto manual)", () => {
    const src = readFileSync(
      path.join(RAIZ_API, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(src, /conflictosGraves = board\.issues\.filter/);
    assert.match(src, /horario_bloqueado: true/);
  });
});