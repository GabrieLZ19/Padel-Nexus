import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function cuerpoMetodo(svc: string, nombre: string, siguiente?: string): string {
  const inicio = svc.indexOf(`${nombre}(`);
  assert.ok(inicio >= 0, nombre);
  const fin = siguiente
    ? svc.indexOf(siguiente, inicio)
    : svc.length;
  assert.ok(fin > inicio, `fin ${nombre}`);
  return svc.slice(inicio, fin);
}

describe("MKT-7 facetas marketplace — solo tiendas activas", () => {
  it("categorías y marcas filtran por vendedores del catálogo público", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(svc, /idsVendedoresCatalogoPublico/);
    assert.match(svc, /MARKETPLACE_ESTADOS_VENDEDOR\.ACTIVO/);
    assert.match(svc, /\.not\("entidad_id", "is", null\)/);

    const categorias = cuerpoMetodo(
      svc,
      "static async listarCategorias",
      "static async listarProductos",
    );
    assert.match(categorias, /idsVendedoresCatalogoPublico/);
    assert.match(categorias, /\.eq\("activo", true\)/);
    assert.match(categorias, /\.in\("vendedor_id", vendedorIds\)/);

    const marcas = cuerpoMetodo(
      svc,
      "static async listarMarcas",
      "static async registrarTiendaEntidad",
    );
    assert.match(marcas, /idsVendedoresCatalogoPublico/);
    assert.match(marcas, /vendedorIds\.length === 0/);
    assert.match(marcas, /return \[\]/);
    assert.match(marcas, /\.in\("vendedor_id", vendedorIds\)/);

    const productos = cuerpoMetodo(
      svc,
      "static async listarProductos",
      "static async obtenerProducto",
    );
    assert.match(productos, /idsVendedoresCatalogoPublico/);
  });
});