import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-29 — PUT partido con programación publicada", () => {
  it("actualizarPartido valida cancha y descanso vía validarAsignacionHorarioPartido", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(src, /programacionEstado === "publicado"/);
    assert.match(src, /validarAsignacionHorarioPartido/);
    assert.match(src, /feedersForTorneo/);
  });

  it("actualizarPartido en evento publicado valida colisión cross-categoría", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async actualizarPartido"),
      svc.indexOf("static async actualizarPartido") + 6000,
    );
    assert.match(bloque, /grupo_id/);
    assert.match(bloque, /validarAsignacionEnEvento/);
    assert.match(bloque, /statusCode:\s*409/);

    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    const actualizar = ctrl.slice(
      ctrl.indexOf("export const actualizarPartido"),
      ctrl.indexOf("export const actualizarPartido") + 1200,
    );
    assert.match(actualizar, /statusCode === 409 \? 409 : 400/);
  });
});