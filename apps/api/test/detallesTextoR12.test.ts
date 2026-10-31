import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { capitalizarNombre, capitalizarPalabra } from "../src/utils/formatoTexto";

describe("Detalles de texto e interfaz - Capitalización de nombres (Item 5)", () => {
  it("preserva siglas en mayúsculas como QA Prueba", () => {
    assert.equal(capitalizarNombre("QA Prueba"), "QA Prueba");
    assert.equal(capitalizarNombre("qa prueba"), "Qa Prueba");
  });

  it("convierte texto en mayúsculas sostenidas a Title Case", () => {
    assert.equal(capitalizarNombre("GABRIEL PEREZ"), "Gabriel Perez");
  });

  it("preserva siglas cortas institucionales o sufijos", () => {
    assert.equal(capitalizarPalabra("QA"), "QA");
    assert.equal(capitalizarPalabra("FAP"), "FAP");
    assert.equal(capitalizarPalabra("JR"), "JR");
    assert.equal(capitalizarPalabra("II"), "II");
  });

  it("capitaliza nombres en minúsculas adecuadamente", () => {
    assert.equal(capitalizarNombre("juan carlos"), "Juan Carlos");
    assert.equal(capitalizarNombre("  lucas   silva  "), "Lucas Silva");
  });
});
