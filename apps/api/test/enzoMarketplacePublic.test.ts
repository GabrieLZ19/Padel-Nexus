import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enzo marketplace público (API)", () => {
  it("expone GET /marketplace/tiendas y campañas públicas", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/marketplace.routes.ts"),
      "utf8",
    );
    assert.match(
      routes,
      /router\.get\("\/tiendas", MarketplaceController\.listarTiendasPublicas\)/,
    );
    assert.match(
      routes,
      /router\.get\(\s*"\/sponsor-campanas\/publicas"/,
    );
    const tiendasIdx = routes.indexOf('router.get("/tiendas"');
    const tiendaIdIdx = routes.indexOf('router.get("/tiendas/:id"');
    assert.ok(tiendasIdx >= 0 && tiendaIdIdx > tiendasIdx);
  });

  it("tienda_destacada solo editable por superadmin", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/marketplace.routes.ts"),
      "utf8",
    );
    assert.match(routes, /\/admin\/vendedores\/:id\/destacada/);
    assert.match(routes, /authorize\(\["superadmin"\]\)/);
  });

  it("listarTiendasPublicas ordena destacadas primero", () => {
    const service = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(service, /listarTiendasPublicas/);
    assert.match(service, /\.order\("tienda_destacada", \{ ascending: false \}\)/);
    assert.match(service, /campanaSponsorVisiblePublico/);
  });

  it("migración tienda_destacada en repo", () => {
    const mig = readFileSync(
      path.join(RAIZ, "..", "..", "supabase", "migrations", "20261122210000_enzo_marketplace_tienda_destacada.sql"),
      "utf8",
    );
    assert.match(mig, /tienda_destacada/);
  });
});