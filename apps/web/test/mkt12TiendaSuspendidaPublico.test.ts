import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-12 tienda suspendida — ficha pública de producto", () => {
  it("bloquea añadir al carrito y muestra aviso cuando la tienda está suspendida", () => {
    const page = readFileSync(
      path.join(WEB_ROOT, "app/(public)/marketplace/producto/[id]/page.tsx"),
      "utf8",
    );
    assert.match(page, /tienda_suspendida/);
    assert.match(page, /Tienda no disponible/);
    assert.match(page, /tiendaSuspendida/);
    assert.match(page, /disabled=\{/);
    assert.match(page, /Añadir al Carrito/);
  });
});