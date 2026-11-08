import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-5 UI auditoría tras corrección de resultado", () => {
  it("BracketEditor recarga auditoría cuando cambian los marcadores", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(fuente, /firmaResultadosPartidos/);
    assert.match(fuente, /activeView, torneoId, firmaResultadosPartidos/);
  });

  it("Paso Resultados avisa que la corrección queda en auditoría", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso9Arbitraje.tsx"),
      "utf8",
    );
    assert.match(fuente, /Corrección registrada/);
    assert.match(fuente, /pestaña Auditoría/);
  });
});
