import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { etiquetaMarcaProducto } from "../utils/marketplaceMarca.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-6 etiqueta de marca en marketplace público", () => {
  it("etiquetaMarcaProducto devuelve null si marca ausente o vacía", () => {
    assert.equal(etiquetaMarcaProducto(null), null);
    assert.equal(etiquetaMarcaProducto(undefined), null);
    assert.equal(etiquetaMarcaProducto(""), null);
    assert.equal(etiquetaMarcaProducto("   "), null);
  });

  it("etiquetaMarcaProducto conserva marca definida", () => {
    assert.equal(etiquetaMarcaProducto("Adidas"), "Adidas");
    assert.equal(etiquetaMarcaProducto("  Bullpadel "), "Bullpadel");
  });

  it("vistas públicas no usan fallback Padel Nexus en marca", () => {
    const catalogo = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/page.tsx"),
      "utf8",
    );
    const producto = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/producto/[id]/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(catalogo, /marca\s*\|\|\s*["']Padel Nexus["']/);
    assert.doesNotMatch(producto, /marca\s*\|\|\s*["']Padel Nexus["']/);
    assert.match(catalogo, /etiquetaMarcaProducto/);
    assert.match(producto, /etiquetaMarcaProducto/);
  });
});