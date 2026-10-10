import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clasePuntosSet,
  clasesResultadoFinalizado,
} from "../utils/marcadorSets";

describe("puntos del marcador", () => {
  it("muestra los games del que pierde con un color que se lee en claro y en oscuro", () => {
    const perdedor = clasePuntosSet(true, false);
    assert.equal(perdedor, "text-gray-300");
    assert.equal(perdedor.includes("text-white"), false);
    assert.equal(clasePuntosSet(true, true), "text-brand-chartreuse");
    assert.equal(clasePuntosSet(false, false), "text-brand-ayuda");
  });

  it("el resultado finalizado no usa fondos negros que el modo claro no aclara", () => {
    const ganado = clasesResultadoFinalizado(true);
    const perdido = clasesResultadoFinalizado(false);
    for (const clase of [ganado.fila, ganado.panel, ganado.puntos, perdido.puntos]) {
      assert.equal(clase.includes("#0a0a0a"), false);
      assert.equal(clase.includes("#161616"), false);
      assert.equal(clase.includes("text-white"), false);
    }
    assert.equal(perdido.puntos.includes("text-gray-300"), true);
    assert.equal(ganado.puntos.includes("bg-brand-chartreuse"), true);
  });
});
