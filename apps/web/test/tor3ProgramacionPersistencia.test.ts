import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-3 programador — servicio de persistencia de config", () => {
  it("el board no envía descansoModo hasta hidratar desde el backend", () => {
    const hook = readFileSync(
      path.join(RAIZ, "components/torneos/programador/useProgramadorBoard.ts"),
      "utf8",
    );
    assert.match(hook, /configHidratadaRef/);
    assert.match(hook, /incluirDescansoPreview/);
  });

  it("TorneosService expone persistirConfigProgramacion", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "utils/services/torneos.ts"),
      "utf8",
    );
    assert.match(fuente, /persistirConfigProgramacion/);
    assert.match(fuente, /\/programacion\/config/);
  });
});
