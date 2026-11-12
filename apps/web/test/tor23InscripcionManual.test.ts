import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-23 inscripción manual UI", () => {
  it("modal aplica categoría del torneo en datos de alta", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/inscripciones/InscripcionManualModal.tsx"),
      "utf8",
    );
    assert.match(modal, /categoriaTorneo/);
    assert.match(modal, /Categoría \(def\./);
    assert.match(modal, /Ficha provisional jugador 1/);
    assert.match(modal, /Ficha provisional jugador 2/);

    const llave = readFileSync(
      path.join(RAIZ, "components/torneos/LlaveAltaParejaPanel.tsx"),
      "utf8",
    );
    assert.match(llave, /categoriaDef/);
    assert.match(llave, /categoria_padel: cat/);
  });

  it("signup menciona club o asociación", () => {
    const signup = readFileSync(
      path.join(RAIZ, "app/(auth)/signup/page.tsx"),
      "utf8",
    );
    assert.match(signup, /cargados por tu club o asociación/);
  });
});
