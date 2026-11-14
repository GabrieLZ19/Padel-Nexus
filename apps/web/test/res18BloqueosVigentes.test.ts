import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-18 bloqueos vigentes en modal", () => {
  it("BloquearHorariosModal pasa desde=hoy al listar", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/clubes/BloquearHorariosModal.tsx"),
      "utf8",
    );
    assert.match(modal, /fechaHoyArgentina/);
    assert.match(modal, /getBloqueos\(clubId, \{ desde: vigentesDesde \}\)/);
    assert.match(modal, /getBloqueos\(\{ desde: vigentesDesde \}\)/);
  });
});
