import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-32 aviso en UI tras cargar resultado", () => {
  it("Paso Resultados muestra warning si la API devuelve avisos", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso9Arbitraje.tsx"),
      "utf8",
    );
    assert.match(fuente, /avisos_programacion_publicada/);
    assert.match(fuente, /Revisar horarios publicados/);
    assert.match(fuente, /sileo\.warning/);
  });
});
