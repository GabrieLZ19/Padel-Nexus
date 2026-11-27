import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { vistaEstadoTorneoPublico } from "../src/utils/estadoTorneoPublico.ts";

describe("PUB-31 vista estado torneo público", () => {
  it("antes del primer partido muestra Próximo aunque el estado sea En curso", () => {
    const vista = vistaEstadoTorneoPublico({
      estado: "En curso",
      fechaPrimerPartido: "2099-06-15",
      ahora: new Date("2099-06-01T15:00:00.000Z"),
    });
    assert.equal(vista.etiqueta, "Próximo");
    assert.equal(vista.mostrarEnVivo, false);
    assert.equal(vista.mostrarProgramado, true);
  });

  it("el día del primer partido muestra En curso y CTA en vivo", () => {
    const vista = vistaEstadoTorneoPublico({
      estado: "En curso",
      fechaPrimerPartido: "2099-06-15T18:00:00.000Z",
      ahora: new Date("2099-06-15T14:00:00.000Z"),
    });
    assert.equal(vista.etiqueta, "En curso");
    assert.equal(vista.mostrarEnVivo, true);
  });
});