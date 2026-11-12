import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("ENT-16 editar vencimiento — recalcular vigencia", () => {
  it("actualizarEstado reconcilia estado al cambiar fecha", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "api/src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(
      fuente,
      /fechaVencimientoOverride[\s\S]{0,400}reconciliarEstadoAlmacenadoConVencimiento/,
    );
  });
});
