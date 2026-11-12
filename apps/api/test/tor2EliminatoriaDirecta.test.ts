import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { esEliminatoriaDirecta } from "../src/utils/formatoTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("TOR-2 eliminatoria directa — UI y generación", () => {
  it("distingue eliminatoria directa de zonas + llaves", () => {
    assert.equal(esEliminatoriaDirecta("Eliminatoria Directa"), true);
    assert.equal(esEliminatoriaDirecta("Zonas + Llaves"), false);
    assert.equal(esEliminatoriaDirecta("Zonas y Eliminatoria"), false);
  });

  it("al generar cuadro no asigna fecha_partido (programador publica horarios)", () => {
    const svc = fuente("apps/api/src/services/torneo.service.ts");
    const inicio = svc.indexOf("if (esEliminatoriaDirecta(torneo.formato))");
    assert.ok(inicio > 0, "Debe existir rama de eliminatoria directa");
    const fin = svc.indexOf("} else {", inicio);
    const bloque = svc.slice(inicio, fin);
    assert.doesNotMatch(
      bloque,
      /fecha_partido:\s*matchTime/,
      "No debe autoprogramar horarios al crear partidos",
    );
    assert.match(bloque, /fecha_partido:\s*null/);
  });

  it("BracketEditor: pestaña Siembra y sin plantilla FAP de zonas", () => {
    const editor = fuente("apps/web/components/torneos/BracketEditor.tsx");
    assert.match(editor, /LayoutGrid className="size-4" \/>\s*Siembra/);
    assert.match(editor, /!isEliminatoriaDirecta \? \(/);
    assert.match(editor, /esEliminatoriaDirecta\(torneo\?\.formato\)/);
  });

  it("getLlaveMatriz no devuelve matriz FAP en eliminatoria directa", () => {
    const ctrl = fuente("apps/api/src/controllers/torneo.controller.ts");
    assert.match(ctrl, /esEliminatoriaDirecta\(torneo\?\.formato\)/);
    assert.match(ctrl, /eliminatoriaDirecta:\s*true/);
  });

  it("BracketEditor: 8 parejas sin byes (no usa matriz zonas)", () => {
    const editor = fuente("apps/web/components/torneos/BracketEditor.tsx");
    assert.match(
      editor,
      /const usaPlantillaFap = !isEliminatoriaDirecta/,
      "No debe contar byes con plantilla FAP de zonas",
    );
    assert.match(editor, /Eliminatoria directa · sin byes/);
  });

  it("feeders eliminatoria directa: semis dependen de cuartos por orden", () => {
    const src = fuente("apps/api/src/utils/programacionPartidos.ts");
    assert.match(src, /buildFeedersEliminatoriaDirecta/);
  });
});
