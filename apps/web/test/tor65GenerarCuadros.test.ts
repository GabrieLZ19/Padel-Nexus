import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-65 Generar Cuadros — UI y servicio", () => {
  it("BracketEditor pide motivo y bloquea con programación publicada", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /programacionPublicada/);
    assert.match(editor, /showInput: true/);
    assert.match(editor, /inputMinLength: 8/);
    assert.match(editor, /generarZonas\(torneoId, undefined, forzar, motivo\)/);
  });

  it("TorneosService.generarZonas envía motivo en el body", () => {
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/torneos.ts"),
      "utf8",
    );
    assert.match(svc, /async generarZonas\(/);
    assert.match(svc, /motivo/);
  });
});