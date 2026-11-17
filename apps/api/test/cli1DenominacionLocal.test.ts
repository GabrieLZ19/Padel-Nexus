import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aplicaDenominacionNacional,
  enrichInscripcionDenominacion,
} from "../src/utils/denominacionNacional.ts";

describe("CLI-1 denominacion en torneos locales", () => {
  it("aplicaDenominacionNacional solo en alcance Nacional", () => {
    assert.equal(aplicaDenominacionNacional("Nacional"), true);
    assert.equal(aplicaDenominacionNacional("Provincial"), false);
    assert.equal(aplicaDenominacionNacional("Local"), false);
    assert.equal(aplicaDenominacionNacional(null), false);
  });

  it("enrich no arma denominacion en torneo local", () => {
    const enriched = enrichInscripcionDenominacion(
      {
        letra_prioridad: "A",
        perfiles: { lugar_residencia: "Neuquén" },
      },
      "Local",
    );
    assert.equal(enriched.denominacion_nacional, null);
  });
});