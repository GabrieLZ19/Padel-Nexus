import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-7 validación lugar de prestación (servicio)", () => {
  it("valida detalles antes de pasar del paso 2", () => {
    const form = readFileSync(
      path.join(RAIZ, "components/marketplace/MarketplaceProductoForm.tsx"),
      "utf8",
    );
    assert.match(form, /validarPasoDetalles/);
    assert.match(form, /step === 2 && !validarPasoDetalles\(\)/);
    assert.match(form, /errorUbicacionServicio/);
  });
});
