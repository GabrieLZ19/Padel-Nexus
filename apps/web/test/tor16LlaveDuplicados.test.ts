import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-16 BracketEditor evita duplicar parejas", () => {
  it("confirma traslado y filtra parejas con resultado", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /mensajesTrasladoPareja/);
    assert.match(editor, /parejasBloqueadasEnLlave/);
    assert.match(editor, /Confirmar movimiento/);
    assert.match(editor, /status === 409/);
    assert.match(editor, /intercambiar/);
    assert.match(editor, /matchEditBaseline/);
  });
});
