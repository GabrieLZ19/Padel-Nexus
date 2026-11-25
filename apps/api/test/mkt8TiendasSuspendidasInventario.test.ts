import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-8 tiendas suspendidas — rutas de moderación", () => {
  it("expone suspender y reactivar vendedor para superadmin", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/marketplace.routes.ts"),
      "utf8",
    );
    assert.match(routes, /\/admin\/vendedores\/:id\/reactivar/);
    assert.match(routes, /\/admin\/vendedores\/:id\/suspender/);
    assert.match(routes, /reactivarVendedor/);
    assert.match(routes, /suspenderVendedor/);
  });

  it("catálogo público excluye tiendas no activas", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(svc, /idsVendedoresCatalogoPublico/);
    assert.match(svc, /MARKETPLACE_ESTADOS_VENDEDOR\.ACTIVO/);
    assert.match(svc, /obtenerTiendaPublica[\s\S]*estado !== MARKETPLACE_ESTADOS_VENDEDOR\.ACTIVO/);
  });
});