import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MARKETPLACE_ORDEN_PENDIENTE_MINUTOS,
  marketplaceOrdenEstadoCobrado,
} from "../src/constants/marketplace.ts";
import {
  ordenPendienteExpirada,
  retencionInicialOrdenDesde,
} from "../src/utils/marketplaceOrdenRetencion.ts";

describe("MKT-1 orden pendiente sin pago", () => {
  it("plazo configurable alineado a reservas MP", () => {
    assert.equal(MARKETPLACE_ORDEN_PENDIENTE_MINUTOS, 15);
  });

  it("detecta expiracion por retiene_hasta", () => {
    const ahora = new Date("2026-11-22T12:00:00.000Z");
    const vigente = {
      estado: "pendiente",
      retiene_hasta: "2026-11-22T12:10:00.000Z",
    };
    const vencida = {
      estado: "pendiente",
      retiene_hasta: "2026-11-22T11:59:00.000Z",
    };
    assert.equal(ordenPendienteExpirada(vigente, ahora), false);
    assert.equal(ordenPendienteExpirada(vencida, ahora), true);
  });

  it("solo pagada y entregada cuentan como cobradas", () => {
    assert.equal(marketplaceOrdenEstadoCobrado("pagada"), true);
    assert.equal(marketplaceOrdenEstadoCobrado("entregada"), true);
    assert.equal(marketplaceOrdenEstadoCobrado("pendiente"), false);
    assert.equal(marketplaceOrdenEstadoCobrado("cancelada"), false);
  });

  it("retencion inicial suma minutos al plazo", () => {
    const desde = new Date("2026-11-22T10:00:00.000Z");
    const hasta = new Date(retencionInicialOrdenDesde(desde));
    assert.equal(
      hasta.getTime() - desde.getTime(),
      MARKETPLACE_ORDEN_PENDIENTE_MINUTOS * 60_000,
    );
  });
});