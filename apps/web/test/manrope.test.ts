import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(relativo: string): string {
  return readFileSync(path.join(WEB, relativo), "utf8");
}

describe("GEN-03 Manrope", () => {
  it("aloja Manrope en WOFF2 con la licencia al lado", () => {
    for (const archivo of [
      "public/fonts/manrope/manrope-latin.woff2",
      "public/fonts/manrope/manrope-latin-ext.woff2",
    ]) {
      const bytes = readFileSync(path.join(WEB, archivo));
      assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", archivo);
    }
    const licencia = fuente("public/fonts/manrope/OFL.txt");
    assert.match(licencia, /SIL OPEN FONT LICENSE/);
    assert.match(licencia, /Manrope Project Authors/);
  });

  it("la interfaz declara Manrope, los cuatro pesos y Arial de respaldo", () => {
    const css = fuente("app/globals.css");
    assert.match(css, /--font-sans:\s*"Manrope", Arial, sans-serif/);
    assert.match(css, /font-weight:\s*400 700/);
    assert.match(css, /font-display:\s*swap/);
    assert.match(css, /manrope-latin\.woff2/);
    assert.match(css, /manrope-latin-ext\.woff2/);
    assert.equal(css.includes("Unigeo-Semibold"), false);
    assert.match(css, /--font-weight-black:\s*700/);
  });

  it("el middleware no intercepta los archivos de la fuente", () => {
    const middleware = fuente("middleware.ts");
    assert.match(middleware, /woff2/);
  });
});
