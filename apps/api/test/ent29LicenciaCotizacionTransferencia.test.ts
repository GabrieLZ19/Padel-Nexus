import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-29 cotización expone transferencia_disponible", () => {
  it("cotizar devuelve flag según alias/CBU de la federación", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /static async cotizar/);
    assert.match(
      svc,
      /transferencia_disponible:\s*\n\s*transferenciaLicenciaDisponible\(transferencia\)/,
    );
  });
});
