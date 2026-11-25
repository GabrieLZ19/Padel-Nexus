import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-5 marketplace móvil — Tiendas antes que filtros", () => {
  it("main ordenado antes del sidebar en DOM y filtros colapsados en móvil", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/page.tsx"),
      "utf8",
    );
    assert.match(page, /order-1 lg:order-2/);
    assert.match(page, /hidden lg:block.*lg:order-1/);
    assert.match(page, /marketplace-filtrar-movil/);
    assert.match(page, /filtrosMovilAbiertos/);
    assert.match(page, /MarketplaceCatalogFiltros/);
    const idxTiendas = page.indexOf("Tiendas");
    const idxFiltrar = page.indexOf("marketplace-filtrar-movil");
    assert.ok(idxTiendas >= 0 && idxFiltrar > idxTiendas);
  });

  it("panel de filtros reutilizable para drawer y desktop", () => {
    const comp = readFileSync(
      path.join(RAIZ, "components/marketplace/MarketplaceCatalogFiltros.tsx"),
      "utf8",
    );
    assert.match(comp, /onCloseMobile/);
    assert.match(comp, /Ver resultados/);
  });
});