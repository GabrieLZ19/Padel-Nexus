import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { debeDescalificarPorWoDeZona } from "../src/utils/walkoverZona";

describe("walk over paso 9", () => {
  it("descalifica si el segundo partido de zona es W.O. sin inicio", () => {
    assert.equal(
      debeDescalificarPorWoDeZona([
        { orden: 1, finalizado: true, esWo: false, esLesion: false, gano: true },
        { orden: 2, finalizado: true, esWo: true, esLesion: false, gano: false },
      ]),
      true,
    );
  });

  it("no descalifica en el primer partido ni si el retiro tiene marcador", () => {
    assert.equal(
      debeDescalificarPorWoDeZona([
        { orden: 1, finalizado: true, esWo: true, esLesion: false, gano: false },
      ]),
      false,
    );
    assert.equal(
      debeDescalificarPorWoDeZona([
        { orden: 1, finalizado: true, esWo: false, esLesion: false, gano: true },
        { orden: 2, finalizado: true, esWo: true, esLesion: true, gano: false },
      ]),
      false,
    );
  });
});
