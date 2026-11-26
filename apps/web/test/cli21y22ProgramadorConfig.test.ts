import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const RAIZ = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function leer(rel: string): string {
  return readFileSync(path.join(RAIZ, rel), "utf8");
}

describe("CLI-21 y CLI-22 — ProgramadorConfigBar", () => {
  it("expone descanso 0 min, duración por día y pasos de 15 min en inicio/fin", () => {
    const src = leer("components/torneos/programador/ProgramadorConfigBar.tsx");

    assert.match(src, /sin_descanso/);
    assert.match(src, /0 min \(partidos seguidos\)/);
    assert.match(src, /min \+= 15/);
    assert.match(src, /franjasPorDia/);
    assert.match(src, /duracion:/);
    assert.match(src, /TURNO_OPTS/);
  });

  it("useProgramadorBoard persiste descansoModo sin_descanso y franjasPorDia", () => {
    const hook = leer("components/torneos/programador/useProgramadorBoard.ts");
    assert.match(hook, /sin_descanso/);
    assert.match(hook, /franjasPorDia/);
    assert.match(hook, /descansoModo/);
  });
});