import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { esModoDescanso, minutosDeModoDescanso } from "../src/utils/programadorReglas.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-30 / CLI-21 — sin_descanso en torneo suelto (controller)", () => {
  it("esModoDescanso acepta sin_descanso y devuelve 0 minutos", () => {
    assert.equal(esModoDescanso("sin_descanso"), true);
    assert.equal(minutosDeModoDescanso("sin_descanso"), 0);
  });

  it("getProgramacionBoard usa esModoDescanso (no whitelist sin sin_descanso)", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/programacion.controller.ts"),
      "utf8",
    );
    const bloque = ctrl.match(
      /export const getProgramacionBoard[\s\S]*?export const asignarProgramacion/,
    )?.[0];
    assert.ok(bloque);
    assert.match(bloque, /esModoDescanso\(descansoModo\)/);
    assert.doesNotMatch(bloque, /descansoModo === "tras_fin_60"/);
  });

  it("persistirConfigProgramacion usa esModoDescanso", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/programacion.controller.ts"),
      "utf8",
    );
    const bloque = ctrl.match(
      /export const persistirConfigProgramacion[\s\S]*?export const nuevaEdicionProgramacion/,
    )?.[0];
    assert.ok(bloque);
    assert.match(bloque, /esModoDescanso\(descansoModo\)/);
    assert.doesNotMatch(bloque, /descansoModo === "entre_inicios_240"/);
  });

  it("persistirFranjas persiste sin_descanso en torneo", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/utils/persistirFranjasProgramacion.ts"),
      "utf8",
    );
    assert.match(src, /esModoDescanso\(opts\.descansoModo\)/);
    assert.match(src, /torneoUpdate\.descanso_modo = opts\.descansoModo/);
  });
});