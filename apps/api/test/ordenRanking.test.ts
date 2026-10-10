import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claveCategoria,
  compararPosicionRanking,
  variantesCategoria,
} from "../src/constants/rankings";

describe("desempate del ranking", () => {
  it("ordena el empate por apellido", () => {
    const lista = [
      { puntos: 2670, apellido: "Wayne", nombre: "Tomas" },
      { puntos: 2670, apellido: "Carrasco", nombre: "José" },
    ].sort(compararPosicionRanking);

    assert.deepEqual(
      lista.map((jugador) => jugador.apellido),
      ["Carrasco", "Wayne"],
    );
  });

  it("si el apellido coincide, ordena por nombre", () => {
    const ana = { puntos: 45, apellido: "Lazo", nombre: "Ana" };
    const gabriel = { puntos: 45, apellido: "Lazo", nombre: "Gabriel" };
    assert.ok(compararPosicionRanking(ana, gabriel) < 0);
  });

  it("los puntos definen el puesto antes que el apellido", () => {
    const arriba = { puntos: 100, apellido: "Zulu", nombre: "Ana" };
    const abajo = { puntos: 10, apellido: "Alba", nombre: "Ana" };
    assert.ok(compararPosicionRanking(arriba, abajo) < 0);
  });

  it("trata 6ª y 6ta como la misma categoría", () => {
    assert.equal(claveCategoria("6ª"), claveCategoria("6ta"));
    assert.equal(claveCategoria("7ma"), claveCategoria("7ª"));
    assert.ok(variantesCategoria("6ª").includes("6ta"));
    assert.ok(variantesCategoria("6ª").includes("6ª"));
  });
});
