import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("RES-18 bloqueos activos vigentes/futuros", () => {
  it("listarBloqueos filtra fecha_fin desde hoy Argentina por defecto", () => {
    const svc = fuente("apps/api/src/services/club.service.ts");
    const bloque = svc.match(
      /static async listarBloqueos[\s\S]*?return data \|\| \[\];/,
    );
    assert.ok(bloque);
    assert.match(bloque![0], /fechaHoyArgentina/);
    assert.match(bloque![0], /gte\("fecha_fin"/);
    assert.match(bloque![0], /desdeVigencia/);
  });

  it("controllers y modal solicitan listado vigente", () => {
    const panel = fuente("apps/api/src/controllers/club-panel.controller.ts");
    const club = fuente("apps/api/src/controllers/club.controller.ts");
    const modal = fuente("apps/web/components/clubes/BloquearHorariosModal.tsx");
    assert.match(panel, /listarBloqueos/);
    assert.match(club, /listarBloqueos/);
    assert.match(modal, /fechaHoyArgentina/);
    assert.match(modal, /desde:\s*vigentesDesde/);
    assert.match(modal, /Bloqueos activos/);
  });
});
