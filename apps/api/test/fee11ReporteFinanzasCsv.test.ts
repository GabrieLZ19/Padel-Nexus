import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  calcularComisionMpMovimiento,
  calcularNetoMovimientoFinanzas,
} from "../src/utils/platformFeeReporteMensual.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-11 reporte Finanzas CSV con nombres, comisión y neto", () => {
  it("reporteMensual enriquece movimientos antes de responder", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/platformFee.service.ts"),
      "utf8",
    );
    assert.match(src, /enriquecerMovimientosFinanzas/);
    assert.match(src, /org_nombre|entidad_nombre|comision_mp|monto_neto/);
  });

  it("calcula comisión MP solo sobre pagos online", () => {
    assert.equal(calcularComisionMpMovimiento(10_000, "mp_online", 6.29), 629);
    assert.equal(calcularComisionMpMovimiento(10_000, "manual", 6.29), 0);
    assert.equal(calcularComisionMpMovimiento(10_000, "planilla", 6.29), 0);
  });

  it("neto = bruto - fee plataforma - comisión MP", () => {
    const comision = calcularComisionMpMovimiento(10_000, "mp_online", 6.29);
    assert.equal(calcularNetoMovimientoFinanzas(10_000, 500, comision), 8871);
  });

  it("util resuelve nombres de organización e inscripciones", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/utils/platformFeeReporteMensual.ts"),
      "utf8",
    );
    assert.match(src, /mapNombresOrganizaciones/);
    assert.match(src, /entidad_nombre/);
    assert.match(src, /marketplace_orden/);
    assert.match(src, /inscripcion_plaza/);
  });

  it("pantalla finanzas exporta columnas legibles", () => {
    const page = readFileSync(
      path.join(RAIZ, "../web/app/dashboard/finanzas/page.tsx"),
      "utf8",
    );
    assert.match(page, /organizacion/);
    assert.match(page, /comision_mp/);
    assert.match(page, /fee_plataforma/);
    assert.match(page, /neto/);
    assert.match(page, /entidad_nombre/);
    assert.doesNotMatch(page, /entidad_tipo:\$\{m\.entidad_id\}/);
  });
});