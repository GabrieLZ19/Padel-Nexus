import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  puntosDeRondaProvincial,
  puntosInscripcionPorMejorInstancia,
} from "../src/utils/puntosProvincia";

describe("puntos de provincia", () => {
  it("suma desde octavos y no antes", () => {
    assert.equal(puntosDeRondaProvincial("FINAL", "ganador"), 8);
    assert.equal(puntosDeRondaProvincial("FINAL", "perdedor"), 6);
    assert.equal(puntosDeRondaProvincial("SEMIS", "perdedor"), 4);
    assert.equal(puntosDeRondaProvincial("CUARTOS", "perdedor"), 2);
    assert.equal(puntosDeRondaProvincial("OCTAVOS", "perdedor"), 1);
    assert.equal(puntosDeRondaProvincial("PRELIMINARES", "perdedor"), 0);
    assert.equal(puntosDeRondaProvincial("16AVOS", "perdedor"), 0);
    assert.equal(puntosDeRondaProvincial("32AVOS", "ganador"), 0);
  });

  it("el campeón se queda con 8 y no acumula las rondas previas", () => {
    const puntos = puntosInscripcionPorMejorInstancia([
      { ronda: "OCTAVOS", ganadorId: "cordoba-a", perdedorId: "otra" },
      { ronda: "CUARTOS", ganadorId: "cordoba-a", perdedorId: "otra-2" },
      { ronda: "SEMIS", ganadorId: "cordoba-a", perdedorId: "rio" },
      { ronda: "FINAL", ganadorId: "cordoba-a", perdedorId: "neuquen-a" },
    ]);
    assert.equal(puntos.get("cordoba-a"), 8);
    assert.equal(puntos.get("neuquen-a"), 6);
    assert.equal(puntos.get("rio"), 4);
  });
});
