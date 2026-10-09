import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  esAlcanceClasificatorio,
  normalizarAlcanceTorneo,
  validarPase,
} from "../src/utils/pasesRepresentacion";

describe("circuito competitivo", () => {
  it("el pase exige otra asociación y un motivo", () => {
    assert.equal(
      validarPase({ origenId: null, destinoId: "b", motivo: "mudanza" }),
      "No tenés una asociación de origen para pedir el pase.",
    );
    assert.equal(
      validarPase({ origenId: "a", destinoId: "a", motivo: "mudanza" }),
      "El pase tiene que ser a otra asociación.",
    );
    assert.equal(
      validarPase({ origenId: "a", destinoId: "b", motivo: "  " }),
      "El motivo es obligatorio.",
    );
    assert.equal(
      validarPase({ origenId: "a", destinoId: "b", motivo: "Cambio de residencia" }),
      null,
    );
  });

  it("clasificatorio es un alcance propio y no se vuelve nacional", () => {
    assert.equal(esAlcanceClasificatorio("Clasificatorio"), true);
    assert.equal(normalizarAlcanceTorneo("clasificatorio"), "Clasificatorio");
    assert.notEqual(normalizarAlcanceTorneo("Clasificatorio"), "Nacional");
  });
});
