import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  montoInscripcionDesdePrecioTorneo,
  plazasInscripcionDesdeContexto,
  precioUnitarioDesdeMonto,
} from "../src/utils/inscripcionMonto.ts";
import { PlatformFeeService } from "../src/services/platformFee.service.ts";
import type { PlatformFeeCheckoutBreakdown } from "../src/constants/platformFee.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

function breakdown(partial: Partial<PlatformFeeCheckoutBreakdown> & {
  montoBruto: number;
  montoFee: number;
  montoTotal: number;
  modo: "absorber" | "sumar";
}): PlatformFeeCheckoutBreakdown {
  const discriminado = partial.modo === "sumar" && partial.montoFee > 0;
  return {
    plazas: partial.plazas ?? 1,
    discriminadoEnCheckout: discriminado,
    ...partial,
    discriminadoEnCheckout:
      partial.discriminadoEnCheckout ?? discriminado,
  };
}

describe("Platform fees · monto inscripción por plaza", () => {
  it("pareja en dobles = 2 plazas y monto 2× precio", () => {
    assert.equal(
      plazasInscripcionDesdeContexto({
        modalidad: "Parejas",
        jugador2Email: "compa@test.com",
      }),
      2,
    );
    assert.equal(montoInscripcionDesdePrecioTorneo(30_000, 2), 60_000);
  });

  it("individual fuerza 1 plaza aunque haya email de compañero en contexto", () => {
    assert.equal(
      plazasInscripcionDesdeContexto({
        modalidad: "Individual",
        jugador2Email: "x@test.com",
      }),
      1,
    );
  });

  it("solo jugador 1 = 1 plaza", () => {
    assert.equal(
      plazasInscripcionDesdeContexto({ modalidad: "Parejas" }),
      1,
    );
    assert.equal(montoInscripcionDesdePrecioTorneo(30_000, 1), 30_000);
  });

  it("precioUnitarioDesdeMonto reparte total en plazas", () => {
    assert.equal(precioUnitarioDesdeMonto(60_000, 2), 30_000);
    assert.equal(precioUnitarioDesdeMonto(30_000, 1), 30_000);
  });

  it("planilla/manual: pareja por identificador = 2 plazas", () => {
    assert.equal(
      plazasInscripcionDesdeContexto({
        modalidad: "Parejas",
        jugador2Identificador: "12345678",
      }),
      2,
    );
  });
});

describe("Platform fees · cálculo de fee", () => {
  const cfgFijo = {
    canal: "inscripciones",
    tipo: "fijo" as const,
    valor: 500,
    activo: true,
  };

  const cfgPct = {
    canal: "marketplace",
    tipo: "porcentaje" as const,
    valor: 10,
    activo: true,
  };

  it("fee fijo inactivo o cero → 0", () => {
    assert.equal(
      PlatformFeeService.calcularMontoFee(
        { ...cfgFijo, activo: false },
        60_000,
        2,
      ),
      0,
    );
    assert.equal(PlatformFeeService.calcularMontoFee(null, 60_000, 2), 0);
  });

  it("fee fijo con inscripción $0 (torneo gratuito) cobra por plaza", () => {
    assert.equal(PlatformFeeService.calcularMontoFee(cfgFijo, 0, 2), 1000);
    assert.equal(PlatformFeeService.calcularMontoFee(cfgFijo, 0, 1), 500);
    assert.equal(PlatformFeeService.calcularMontoFee(cfgPct, 0, 2), 0);
  });

  it("fee fijo × unidades (2 plazas = 2× fee)", () => {
    assert.equal(PlatformFeeService.calcularMontoFee(cfgFijo, 60_000, 2), 1000);
    assert.equal(PlatformFeeService.calcularMontoFee(cfgFijo, 60_000, 1), 500);
  });

  it("fee porcentaje sobre bruto total", () => {
    assert.equal(PlatformFeeService.calcularMontoFee(cfgPct, 10_000, 1), 1000);
    assert.equal(PlatformFeeService.calcularMontoFee(cfgPct, 10_000, 2), 1000);
  });
});

describe("Platform fees · ítems Mercado Pago inscripción", () => {
  it("pareja: 2 líneas de inscripción al precio por plaza", () => {
    const items = PlatformFeeService.buildMpItemsInscripcion({
      inscripcionId: "ins-1",
      torneoNombre: "Open Test",
      precioPorPlaza: 30_000,
      plazas: 2,
      breakdown: breakdown({
        montoBruto: 60_000,
        montoFee: 0,
        montoTotal: 60_000,
        modo: "absorber",
        plazas: 2,
      }),
    });
    assert.equal(items.length, 2);
    assert.equal(items[0].unit_price, 30_000);
    assert.equal(items[1].unit_price, 30_000);
    assert.match(items[0].title, /Plaza 1/);
    assert.match(items[1].title, /Plaza 2/);
  });

  it("modo sumar: discrimina cargo por servicio (1 línea si 1 plaza)", () => {
    const items = PlatformFeeService.buildMpItemsInscripcion({
      inscripcionId: "ins-2",
      torneoNombre: "Torneo",
      precioPorPlaza: 30_000,
      plazas: 1,
      breakdown: breakdown({
        montoBruto: 30_000,
        montoFee: 500,
        montoTotal: 30_500,
        modo: "sumar",
        plazas: 1,
      }),
    });
    assert.equal(items.length, 2);
    assert.equal(items[1].title, "Cargo por servicio Padel Nexus");
    assert.equal(items[1].unit_price, 500);
  });

  it("modo sumar con 2 plazas: reparte fee impar sin perder centavos", () => {
    const items = PlatformFeeService.buildMpItemsInscripcion({
      inscripcionId: "ins-3",
      torneoNombre: "Torneo",
      precioPorPlaza: 30_000,
      plazas: 2,
      breakdown: breakdown({
        montoBruto: 60_000,
        montoFee: 501,
        montoTotal: 60_501,
        modo: "sumar",
        plazas: 2,
      }),
    });
    const fees = items.filter((i) => i.title.includes("Cargo por servicio"));
    assert.equal(fees.length, 2);
    const sumaFee = fees.reduce((a, i) => a + i.unit_price, 0);
    assert.equal(sumaFee, 501);
    const sumaTotal = items.reduce((a, i) => a + i.unit_price, 0);
    assert.equal(sumaTotal, 60_501);
  });

  it("modo absorber: no agrega línea de fee en checkout", () => {
    const items = PlatformFeeService.buildMpItemsInscripcion({
      inscripcionId: "ins-4",
      torneoNombre: "Torneo",
      precioPorPlaza: 30_000,
      plazas: 2,
      breakdown: breakdown({
        montoBruto: 60_000,
        montoFee: 1000,
        montoTotal: 60_000,
        modo: "absorber",
        plazas: 2,
      }),
    });
    assert.equal(items.length, 2);
    assert.ok(!items.some((i) => i.title.includes("Cargo por servicio")));
  });
});

describe("Platform fees · fórmula liquidación neto", () => {
  function netoTransferir(input: {
    bruto_online: number;
    fees_descontar: number;
    saldo_pendiente: number;
    comision_pct: number;
  }): number {
    const comision_mp = Math.round((input.bruto_online * input.comision_pct) / 100);
    const monto_neto =
      input.bruto_online -
      input.fees_descontar -
      comision_mp -
      input.saldo_pendiente;
    return Math.max(0, monto_neto);
  }

  it("ejemplo Héctor: $10.000 reserva, fee $500 absorbido, MP ~6.29%", () => {
    const bruto = 10_000;
    const fee = 500;
    const neto = netoTransferir({
      bruto_online: bruto,
      fees_descontar: fee,
      saldo_pendiente: 0,
      comision_pct: 6.29,
    });
    assert.equal(Math.round(bruto * 0.0629), 629);
    assert.equal(neto, 10_000 - 500 - 629);
  });

  it("descuenta saldo pendiente off-platform del neto", () => {
    const neto = netoTransferir({
      bruto_online: 100_000,
      fees_descontar: 5_000,
      saldo_pendiente: 3_000,
      comision_pct: 6.29,
    });
    assert.equal(neto, 100_000 - 5_000 - Math.round(100_000 * 0.0629) - 3_000);
  });

  it("neto no negativo", () => {
    assert.equal(
      netoTransferir({
        bruto_online: 100,
        fees_descontar: 500,
        saldo_pendiente: 0,
        comision_pct: 6.29,
      }),
      0,
    );
  });
});

describe("Platform fees · integración en código (regresión)", () => {
  it("inscripción MP usa buildMpItemsInscripcion y plazas", () => {
    const src = fuente("apps/api/src/services/inscripcion.service.ts");
    assert.match(src, /buildMpItemsInscripcion/);
    assert.match(src, /montoInscripcionDesdePrecioTorneo/);
    assert.match(src, /registrarFeesInscripcionPorPlaza|registrarFeeInscripcionOnline/);
  });

  it("ledger por plaza usa entidad inscripcion_plaza", () => {
    const src = fuente("apps/api/src/services/platformFee.service.ts");
    assert.match(src, /entidadTipo:\s*"inscripcion_plaza"/);
    assert.match(src, /:plaza-\$\{i\}/);
  });

  it("pago manual off-platform registra fee", () => {
    const src = fuente("apps/api/src/services/pago.service.ts");
    assert.match(src, /registrarFeeInscripcionOffPlatform/);
  });

  it("saldo torneo MP usa external_reference saldo_torneo", () => {
    const src = fuente("apps/api/src/services/platformFee.service.ts");
    assert.match(src, /saldo_torneo:\$\{torneoId\}/);
    const webhook = fuente("apps/api/src/services/platformFeeWebhook.service.ts");
    assert.match(webhook, /saldo_torneo:/);
  });

  it("rutas platform-fees registradas en app", () => {
    const src = fuente("apps/api/src/app.ts");
    assert.match(src, /platform-fees/);
    assert.match(src, /platformFeeRoutes/);
  });

  it("migración tablas fees existe en supabase", () => {
    const sql = fuente("supabase/migrations/20261117120000_platform_fees.sql");
    assert.match(sql, /plataforma_fee_canales/);
    assert.match(sql, /plataforma_fee_movimientos/);
    assert.match(sql, /plataforma_liquidaciones/);
  });
});

describe("Platform fees · countPlazasInscripcion", () => {
  it("coincide con usuario2_id", () => {
    assert.equal(PlatformFeeService.countPlazasInscripcion(null), 1);
    assert.equal(PlatformFeeService.countPlazasInscripcion("uuid-2"), 2);
  });
});