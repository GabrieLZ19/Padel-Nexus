import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-12 tienda suspendida — ventas por enlace directo", () => {
  it("valida vendedores activos al crear orden", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async crearOrden"),
      svc.indexOf("private static async calcularSubtotalCarrito"),
    );
    assert.match(bloque, /assertVendedoresActivosParaVenta/);
  });

  it("revalida tienda al generar preferencia de pago y al preview de checkout", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    const pref = svc.slice(
      svc.indexOf("static async crearPreferenciaMercadoPago"),
      svc.indexOf("static async confirmarPagoOrdenRetorno"),
    );
    assert.match(pref, /assertVendedoresActivosParaVenta/);

    const previewOrden = svc.slice(
      svc.indexOf("static async previewCheckoutOrden"),
      svc.indexOf("private static async restaurarStockItemsOrden"),
    );
    assert.match(previewOrden, /assertVendedoresActivosParaVenta/);

    const carrito = svc.slice(
      svc.indexOf("private static async calcularSubtotalCarrito"),
      svc.indexOf("static async previewCheckoutCarrito"),
    );
    assert.match(carrito, /assertVendedoresActivosParaVenta/);
  });

  it("expone tienda_suspendida en detalle público de producto", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async obtenerProducto"),
      svc.indexOf("static async listarMarcas"),
    );
    assert.match(bloque, /estado\)/);
    assert.match(bloque, /tienda_suspendida/);
  });

  it("el controller responde 403 ante tienda suspendida en orden y pago", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/marketplace.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /statusHttpTiendaSuspendidaVenta/);
    assert.match(ctrl, /no está disponible para nuevas compras/);

    const crearOrden = ctrl.slice(
      ctrl.indexOf("static async crearOrden"),
      ctrl.indexOf("static async previewCheckoutCarrito"),
    );
    assert.match(crearOrden, /statusHttpTiendaSuspendidaVenta/);

    const pagar = ctrl.slice(
      ctrl.indexOf("static async pagarOrden"),
      ctrl.indexOf("static async confirmarRetornoPago"),
    );
    assert.match(pagar, /statusHttpTiendaSuspendidaVenta/);
  });

  it("assertVendedoresActivosParaVenta exige estado activo", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("assertVendedoresActivosParaVenta"),
      svc.indexOf("static async obtenerUltimaSuspensionVendedor"),
    );
    assert.match(bloque, /MARKETPLACE_ESTADOS_VENDEDOR\.ACTIVO/);
    assert.match(bloque, /no está disponible para nuevas compras/);
  });
});