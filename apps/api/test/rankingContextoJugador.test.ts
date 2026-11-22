import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contextoDesdeTorneo,
  fusionarContextosRanking,
  scopePublicoDesdeTorneo,
} from "../src/utils/rankingContextoJugador";

describe("rankingContextoJugador", () => {
  it("scopePublicoDesdeTorneo distingue Nacional y Global", () => {
    assert.equal(scopePublicoDesdeTorneo("Nacional"), "Nacional");
    assert.equal(scopePublicoDesdeTorneo("Regional"), "Provincial");
    assert.equal(scopePublicoDesdeTorneo("Global"), "Global");
    assert.equal(scopePublicoDesdeTorneo("Internacional"), "Global");
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