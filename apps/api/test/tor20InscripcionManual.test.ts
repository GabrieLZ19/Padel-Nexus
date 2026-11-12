import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("TOR-20 inscripción manual — ficha provisional", () => {
  it("API resuelve jugador con alta como en planilla", () => {
    const perfil = readFileSync(
      path.join(RAIZ, "api/src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(perfil, /resolverJugadorParaInscripcionManual/);
    assert.match(perfil, /resolverJugadorDesdePlanilla/);
    const inscripcion = readFileSync(
      path.join(RAIZ, "api/src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(inscripcion, /resolverJugadorParaInscripcionManual/);
    assert.match(inscripcion, /jugador1_ficha_creada/);
  });

  it("controlador acepta jugador1_datos y jugador2_datos", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "api/src/controllers/inscripcion.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /jugador1_datos/);
    assert.match(ctrl, /jugador2_datos/);
  });
});
