import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-32 selector categoría en detalle público", () => {
  it("el encabezado no recorta el menú del dropdown", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /overflow-visible/);
    assert.doesNotMatch(
      pagina,
      /<header[^>]*overflow-hidden/,
    );
  });

  it("SelectorCategoriaEvento eleva z-index en modo público", () => {
    const selector = readFileSync(
      path.join(RAIZ, "components/torneos/SelectorCategoriaEvento.tsx"),
      "utf8",
    );
    assert.match(selector, /modoPublico \? "relative z-20"/);
  });
});

describe("RNK-5 filtros ranking con alcance Club", () => {
  it("la barra de filtros permite flex-wrap dentro del recuadro", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/ranking/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /flex flex-wrap gap-3/);
    assert.match(pagina, /basis-full sm:basis-auto/);
    assert.match(pagina, /min-w-0 flex-1 basis-\[min\(100%,14rem\)\]/);
  });
});