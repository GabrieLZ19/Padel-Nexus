import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("PUB-11 títulos de notificación (sentence case)", () => {
  it("licencias usa sentence case en títulos de push", () => {
    const licencia = readFileSync(
      path.join(RAIZ, "api/src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(licencia, /titulo: "Licencia aprobada"/);
    assert.match(licencia, /titulo: "Nueva solicitud de licencia"/);
    assert.match(licencia, /titulo: "Solicitud de alta rechazada"/);
    assert.doesNotMatch(licencia, /titulo: "Licencia Aprobada"/);
    assert.doesNotMatch(licencia, /titulo: "Nueva Solicitud de Licencia"/);
  });
});
