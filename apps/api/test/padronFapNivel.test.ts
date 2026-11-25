import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNivelFapFicha } from "../src/utils/padronFapNivel";

describe("padron FAP — nivel", () => {
  it("mapea Damas y Caballeros con ordinales", () => {
    assert.deepEqual(parseNivelFapFicha("Damas Tercera"), {
      sexo: "femenino",
      categoria_padel: "3ª",
    });
    assert.deepEqual(parseNivelFapFicha("Caballeros Sexta"), {
      sexo: "masculino",
      categoria_padel: "6ª",
    });
    assert.deepEqual(parseNivelFapFicha("Caballeros Septima"), {
      sexo: "masculino",
      categoria_padel: "7ª",
    });
  });

  it("Sin categorizar usa Inicial", () => {
    assert.deepEqual(parseNivelFapFicha("Damas Sin Categorizar"), {
      sexo: "femenino",
      categoria_padel: "Inicial",
    });
  });
});