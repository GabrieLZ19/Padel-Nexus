import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { puedeVerTorneoFueraDelSitioPublico } from "../src/utils/accesoTorneoPublico.ts";
import {
  esTorneoVisibleEnSitioPublico,
  resolverEsPruebaTorneo,
  resolverVisibleSitioPublico,
} from "../src/utils/datoPrueba.ts";

describe("TOR-44 acceso a torneo no publico para inscriptos", () => {
  it("visible en sitio y es_prueba son independientes (TOR-56)", () => {
    assert.equal(resolverVisibleSitioPublico("Torneo Club 7ª", false), false);
    assert.equal(resolverVisibleSitioPublico("Torneo Club 7ª", true), true);
    assert.equal(resolverEsPruebaTorneo("Torneo Club 7ª", false), false);
    assert.equal(resolverEsPruebaTorneo("Torneo Club 7ª", true), true);
    assert.equal(
      esTorneoVisibleEnSitioPublico({
        nombre: "Torneo Club 7ª",
        es_prueba: true,
        visible_sitio_publico: true,
      }),
      true,
    );
    assert.equal(
      esTorneoVisibleEnSitioPublico({
        nombre: "Torneo Club 7ª",
        es_prueba: false,
        visible_sitio_publico: false,
      }),
      false,
    );
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