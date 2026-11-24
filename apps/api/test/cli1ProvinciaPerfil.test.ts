import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrichInscripcionDenominacion } from "../src/utils/denominacionNacional.ts";
import { provinciaEfectivaDesdePerfil } from "../src/utils/provinciaPerfil.ts";
import { provinciaParaRanking } from "../src/utils/provinciaRanking.ts";

describe("CLI-1 provincia desde localidad en perfil", () => {
  it("infiere Neuquen desde Plottier sin usar la localidad como provincia", () => {
    assert.equal(provinciaEfectivaDesdePerfil("Plottier"), "Neuquén");
    assert.equal(provinciaEfectivaDesdePerfil("Cutral Co"), "Neuquén");
    assert.equal(provinciaEfectivaDesdePerfil("Zapala"), "Neuquén");
  });

  it("mantiene provincia canonica y siglas de asociacion en ranking", () => {
    const siglas = new Map([["APN", "Neuquén"]]);
    assert.equal(provinciaParaRanking("Neuquén", siglas), "Neuquén");
    assert.equal(provinciaParaRanking("APN", siglas), "Neuquén");
    assert.equal(provinciaParaRanking("Plottier", siglas), "Neuquén");
  });

  it("denominacion nacional usa provincia inferida con localidad en lugar_residencia", () => {
    const enriched = enrichInscripcionDenominacion(
      {
        letra_prioridad: "B",
        perfiles: { lugar_residencia: "Plottier" },
      },
      "Nacional",
    );
    assert.equal(enriched.provincia, "Neuquén");
    assert.equal(enriched.denominacion_nacional, "NEUQUÉN B");
  });
});