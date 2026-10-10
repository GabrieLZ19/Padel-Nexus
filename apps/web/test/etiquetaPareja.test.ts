import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIBRE,
  POR_DEFINIR,
  etiquetaParejaVisible,
} from "../utils/etiquetaPareja";

describe("etiqueta de pareja", () => {
  it("en un nacional une provincia, letra y apellidos", () => {
    const etiqueta = etiquetaParejaVisible({
      nacional: true,
      provincia: "CÓRDOBA",
      letra: "c",
      j1: "FUENTES, Gerónimo",
      j2: "TOMASINI, Dardo",
    });
    assert.equal(etiqueta, "Córdoba C · Fuentes / Tomasini");
  });

  it("arma la misma etiqueta desde la denominación guardada", () => {
    const etiqueta = etiquetaParejaVisible({
      nacional: true,
      denominacion: "CÓRDOBA C",
      j1: "Fuentes, Gerónimo",
      j2: "Tomasini, Dardo",
    });
    assert.equal(etiqueta, "Córdoba C · Fuentes / Tomasini");
  });

  it("sin pareja no inventa Libre: el hueco es Por definir y Libre queda para el bye", () => {
    assert.equal(
      etiquetaParejaVisible({
        nacional: true,
        provincia: "Córdoba",
        letra: "C",
      }),
      "Córdoba C",
    );
    assert.equal(
      etiquetaParejaVisible({ nacional: true, j1: null, j2: null }),
      "",
    );
    assert.equal(POR_DEFINIR, "Por definir");
    assert.equal(LIBRE, "Libre");
    assert.notEqual(POR_DEFINIR, LIBRE);
  });
});
