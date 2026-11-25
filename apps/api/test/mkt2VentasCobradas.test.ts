import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  contarOrdenesCobradasDesdeFilas,
  contarUnidadesCobradasDesdeFilas,
} from "../src/utils/marketplaceVentasCobradas.ts";

const RAIZ_API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const RAIZ_WEB = path.resolve(RAIZ_API, "../web");

function fuenteApi(rel: string): string {
  return readFileSync(path.join(RAIZ_API, rel), "utf8");
}

function fuenteWeb(rel: string): string {
  return readFileSync(path.join(RAIZ_WEB, rel), "utf8");
}

/** Bloque `obtenerTiendaPublica` sin depender del resto del servicio. */
function cuerpoObtenerTiendaPublica(svc: string): string {
  const inicio = svc.indexOf("static async obtenerTiendaPublica");
  assert.ok(inicio >= 0, "obtenerTiendaPublica");
  const fin = svc.indexOf("static async listarTiendasPublicas", inicio);
  assert.ok(fin > inicio, "listarTiendasPublicas");
  return svc.slice(inicio, fin);
}

describe("MKT-2 ventas cobradas", () => {
  it("cuenta solo ordenes pagada o entregada (sin pendiente)", () => {
    const filas = [
      { orden_id: "a", estado: "pendiente" },
      { orden_id: "b", estado: "pagada" },
      { orden_id: "b", estado: "pagada" },
      { orden_id: "c", estado: "entregada" },
      { orden_id: "d", estado: "cancelada" },
    ];
    assert.equal(contarOrdenesCobradasDesdeFilas(filas), 2);
  });

  it("unidades cobradas ignoran pendientes y canceladas", () => {
    const filas = [
      { estado: "pendiente", cantidad: 2 },
      { estado: "pagada", cantidad: 1 },
      { estado: "pagada", cantidad: 3 },
      { estado: "cancelada", cantidad: 9 },
    ];
    assert.equal(contarUnidadesCobradasDesdeFilas(filas), 4);
  });

  it("tienda pública: total_ventas con contarOrdenesCobradasPorVendedor (no columna stale)", () => {
    const bloque = cuerpoObtenerTiendaPublica(
      fuenteApi("src/services/marketplace.service.ts"),
    );
    assert.match(
      bloque,
      /const total_ventas = await contarOrdenesCobradasPorVendedor\(vendedorId\)/,
    );
    assert.match(bloque, /return \{[\s\S]*total_ventas,/);
  });

  it("producto, CRM tienda y stats usan el mismo contador de órdenes cobradas", () => {
    const svc = fuenteApi("src/services/marketplace.service.ts");
    assert.match(
      svc,
      /obtenerProducto[\s\S]*contarOrdenesCobradasPorVendedor\(vendedorRaw\.id\)/,
    );
    assert.match(
      svc,
      /obtenerTiendaEntidad[\s\S]*contarOrdenesCobradasPorVendedor\(data\.id\)/,
    );
    assert.match(
      svc,
      /obtenerEstadisticas[\s\S]*contarOrdenesCobradasPorVendedor\(vendedorId\)/,
    );
  });

  it("confirmar pago sincroniza total_ventas del vendedor", () => {
    const svc = fuenteApi("src/services/marketplace.service.ts");
    assert.match(svc, /sincronizarTotalVentasVendedor/);
  });

  it("tienda pública (web) muestra total_ventas del resumen API", () => {
    const page = fuenteWeb("app/(public)/marketplace/tienda/[id]/page.tsx");
    assert.match(page, /getTiendaPublica/);
    assert.match(page, /\{tienda\.total_ventas\}/);
    assert.doesNotMatch(page, /total_ventas.*pendiente/i);
  });
});