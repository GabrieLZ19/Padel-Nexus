import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("TOR-23 inscripción manual — categoría y fichas huérfanas", () => {
  it("manual inscripción usa categoría del torneo y revierte fichas", () => {
    const inscripcion = readFileSync(
      path.join(RAIZ, "api/src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(inscripcion, /completarDatosAltaConCategoriaTorneo/);
    assert.match(inscripcion, /usarFallbackPlanilla5: false/);
    assert.match(inscripcion, /revertirFichasProvisionalInscripcion/);

    const perfil = readFileSync(
      path.join(RAIZ, "api/src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(perfil, /revertirFichaProvisionalInscripcion/);
    assert.match(perfil, /usarFallbackPlanilla5/);
    assert.match(perfil, /club o asociación/);

    const llave = readFileSync(
      path.join(RAIZ, "api/src/services/llaveAltaPareja.service.ts"),
      "utf8",
    );
    assert.match(llave, /revertirFichaProvisionalInscripcion/);
    assert.match(llave, /usarFallbackPlanilla5: false/);
  });
});
