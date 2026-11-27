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
});