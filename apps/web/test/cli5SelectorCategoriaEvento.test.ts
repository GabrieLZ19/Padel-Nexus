import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-5 selector categoría evento", () => {
  it("servicio y selector en Cuadros, Resultados y vista pública", () => {
    const torneos = readFileSync(
      path.join(RAIZ, "utils/services/torneos.ts"),
      "utf8",
    );
    assert.match(torneos, /getCategoriasEvento/);

    const selector = readFileSync(
      path.join(RAIZ, "components/torneos/SelectorCategoriaEvento.tsx"),
      "utf8",
    );
    assert.match(selector, /pasoWizard/);
    assert.match(selector, /modoPublico/);
    assert.doesNotMatch(selector, /\bfetch\s*\(/);

    const cuadros = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso8Cuadros.tsx"),
      "utf8",
    );
  assert.match(cuadros, /SelectorCategoriaEvento/);
    assert.match(cuadros, /pasoWizard="draws"/);

    const resultados = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso9Arbitraje.tsx"),
      "utf8",
    );
    assert.match(resultados, /SelectorCategoriaEvento/);
    assert.match(resultados, /pasoWizard="matches"/);

    const publica = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(publica, /modoPublico/);
  });
});