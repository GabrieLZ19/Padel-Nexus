import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contextoDesdeTorneo,
  fusionarContextosRanking,
  scopePublicoDesdeTorneo,
} from "../src/utils/rankingContextoJugador";

describe("rankingContextoJugador", () => {
  it("scopePublicoDesdeTorneo mapea Club, Provincial y Nacional", () => {
    assert.equal(scopePublicoDesdeTorneo("Local"), "Club");
    assert.equal(scopePublicoDesdeTorneo("Privado"), "Club");
    assert.equal(scopePublicoDesdeTorneo("Regional"), "Provincial");
    assert.equal(scopePublicoDesdeTorneo("Provincial"), "Provincial");
    assert.equal(scopePublicoDesdeTorneo("Nacional"), "Nacional");
    assert.equal(scopePublicoDesdeTorneo("Global"), "Nacional");
    assert.equal(scopePublicoDesdeTorneo("Internacional"), "Nacional");
  });

  it("contextoDesdeTorneo expone rama Damas y Caballeros", () => {
    const damas = contextoDesdeTorneo({
      id: "t-d",
      nombre: "Copa",
      nivel: "7ª",
      rama: "Femenina",
      alcance: "Provincial",
    });
    const caballeros = contextoDesdeTorneo({
      id: "t-c",
      nombre: "Copa",
      nivel: "7ª",
      rama: "Caballeros",
      alcance: "Provincial",
    });
    assert.equal(damas?.rama, "femenino");
    assert.equal(caballeros?.rama, "masculino");
  });

  it("contextoDesdeTorneo arma etiqueta y categoría desde nivel", () => {
    const ctx = contextoDesdeTorneo({
      id: "t1",
      nombre: "Apertura 2026",
      nivel: "5ª",
      alcance: "Nacional",
      fecha: "2026-01-10",
    });
    assert.ok(ctx);
    assert.equal(ctx?.categoria, "5ª");
    assert.equal(ctx?.scope, "Nacional");
    assert.equal(ctx?.etiqueta, "Apertura 2026 · 5ª");
  });

  it("fusionarContextosRanking ordena por fechaReferencia descendente (torneo más reciente primero)", () => {
    const t1 = contextoDesdeTorneo({
      id: "t-viejo",
      nombre: "Copa 2024",
      nivel: "6ª",
      alcance: "Provincial",
      fecha_fin: "2024-06-01",
    });
    const t2 = contextoDesdeTorneo({
      id: "t-nuevo",
      nombre: "Copa 2025",
      nivel: "6ª",
      alcance: "Provincial",
      fecha_fin: "2025-11-20",
    });
    assert.ok(t1 && t2);
    const ordenados = fusionarContextosRanking([t1, t2]);
    assert.equal(ordenados.length, 2);
    assert.equal(ordenados[0].torneoId, "t-nuevo");
    assert.equal(ordenados[1].torneoId, "t-viejo");
  });

  it("fusionarContextosRanking conserva el contexto más reciente por torneo", () => {
    const base = contextoDesdeTorneo({
      id: "t1",
      nombre: "Torneo",
      nivel: "6ª",
      alcance: "Provincial",
      fecha: "2025-01-01",
    });
    assert.ok(base);
    const viejo = { ...base!, fechaReferencia: "2025-01-01T00:00:00.000Z" };
    const nuevo = { ...base!, fechaReferencia: "2026-06-01T00:00:00.000Z" };
    const ordenados = fusionarContextosRanking([viejo, nuevo]);
    assert.equal(ordenados.length, 1);
    assert.equal(ordenados[0].fechaReferencia, nuevo.fechaReferencia);
  });
});