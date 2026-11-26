import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-10 tienda suspendida — CRM solo lectura", () => {
  it("distingue acceso de consulta vs gestión activa", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(svc, /assertAccesoTiendaEntidad/);
    assert.match(
      svc,
      /assertGestionTiendaEntidad[\s\S]*assertAccesoTiendaEntidad/,
    );
    assert.match(svc, /obtenerUltimaSuspensionVendedor/);
    assert.match(svc, /motivo_suspension/);
  });

  it("permite listar productos, ventas y estadísticas con tienda suspendida", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/marketplace.controller.ts"),
      "utf8",
    );
    const bloqueProductos = /listarProductosEntidad[\s\S]*?res\.json\(resultado\)/.exec(
      ctrl,
    );
    assert.ok(bloqueProductos, "listarProductosEntidad");
    assert.match(bloqueProductos![0], /assertAccesoTiendaEntidad/);

    const bloqueVentas = /listarVentasEntidad[\s\S]*?res\.json\(resultado\)/.exec(
      ctrl,
    );
    assert.ok(bloqueVentas, "listarVentasEntidad");
    assert.match(bloqueVentas![0], /assertAccesoTiendaEntidad/);

    const bloqueStats =
      /obtenerEstadisticasEntidad[\s\S]*?res\.json\(stats\)/.exec(ctrl);
    assert.ok(bloqueStats, "obtenerEstadisticasEntidad");
    assert.match(bloqueStats![0], /assertAccesoTiendaEntidad/);
  });

  it("mantiene assertGestionTiendaEntidad en alta de productos", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/marketplace.controller.ts"),
      "utf8",
    );
    const bloqueCrear = /crearProductoEntidad[\s\S]*?res\.status\(201\)/.exec(ctrl);
    assert.ok(bloqueCrear, "crearProductoEntidad");
    assert.match(bloqueCrear![0], /assertGestionTiendaEntidad/);
  });
});