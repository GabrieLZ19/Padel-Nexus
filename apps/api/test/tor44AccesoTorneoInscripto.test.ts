import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { puedeVerTorneoFueraDelSitioPublico } from "../src/utils/accesoTorneoPublico.ts";
import { resolverEsPruebaTorneo } from "../src/utils/datoPrueba.ts";

describe("TOR-44 acceso a torneo no publico para inscriptos", () => {
  it("marca no visible en sitio publico cuando visible_sitio_publico es false", () => {
    assert.equal(resolverEsPruebaTorneo("Torneo Club 7ª", false), true);
    assert.equal(resolverEsPruebaTorneo("Torneo Club 7ª", true), false);
  });

  it("puedeVerTorneoFueraDelSitioPublico", () => {
    assert.equal(
      puedeVerTorneoFueraDelSitioPublico(true, true, false),
      true,
      "CRM siempre ve",
    );
    assert.equal(
      puedeVerTorneoFueraDelSitioPublico(false, false, false),
      true,
      "torneo publico",
    );
    assert.equal(
      puedeVerTorneoFueraDelSitioPublico(false, true, false),
      false,
      "anonimo en torneo oculto",
    );
    assert.equal(
      puedeVerTorneoFueraDelSitioPublico(false, true, true),
      true,
      "inscripto en torneo oculto",
    );
  });
});