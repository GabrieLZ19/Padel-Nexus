import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contarActivosEnConjunto,
  etiquetaActivos,
  etiquetaCategoriaInscripcion,
} from "../src/utils/categoriaInscripcion";
import {
  contarActivosEnConjunto as contarWeb,
  etiquetaActivos as etiquetaActivosWeb,
  etiquetaCategoriaInscripcion as etiquetaWeb,
} from "../../web/utils/categoriaInscripcion";

describe("panel de asociación", () => {
  it("toma la categoría del torneo y no usa Sin categoría", () => {
    assert.equal(
      etiquetaCategoriaInscripcion({
        categoria: null,
        nivelTorneo: "7ª",
        categoriaTorneo: "Libres",
      }),
      "7ª · Libres",
    );
    assert.equal(
      etiquetaCategoriaInscripcion({
        categoria: "Sin categoría",
        nivelTorneo: "6ª",
      }),
      "6ª",
    );
    assert.equal(
      etiquetaCategoriaInscripcion({ categoria: "5ª" }),
      "5ª",
    );
    assert.equal(etiquetaCategoriaInscripcion({}), "");
    assert.equal(
      etiquetaWeb({ nivelTorneo: "7ª", categoriaTorneo: "Libres" }),
      etiquetaCategoriaInscripcion({
        nivelTorneo: "7ª",
        categoriaTorneo: "Libres",
      }),
    );
  });

  it("cuenta activos solo dentro del conjunto del indicador", () => {
    const provinciales = [
      { estado: "En curso" },
      { estado: "Borrador" },
      { estado: "Inscripción" },
    ];
    assert.equal(contarActivosEnConjunto(provinciales), 2);
    assert.equal(etiquetaActivos(1), "1 activo");
    assert.equal(etiquetaActivos(0), "0 activos");
    assert.equal(etiquetaActivos(10), "10 activos");
    assert.equal(contarWeb(provinciales), contarActivosEnConjunto(provinciales));
    assert.equal(etiquetaActivosWeb(2), etiquetaActivos(2));
  });
});
