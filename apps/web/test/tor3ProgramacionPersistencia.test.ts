import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-3 programador — servicio de persistencia de config", () => {
  it("TorneosService expone persistirConfigProgramacion", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "utils/services/torneos.ts"),
      "utf8",
    );
    assert.match(fuente, /persistirConfigProgramacion/);
    assert.match(fuente, /\/programacion\/config/);
  });
});
