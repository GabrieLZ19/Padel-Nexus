import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decidirAlcanceTorneo,
  mismaProvincia,
} from "../src/utils/alcanceCuenta";

const tucuman = {
  rol: "admin_provincial",
  provincia: "Tucumán",
  clubId: null,
};

describe("alcance de la cuenta", () => {
  it("iguala provincias con y sin tilde", () => {
    assert.equal(mismaProvincia("Tucumán", "tucuman"), true);
    assert.equal(mismaProvincia("Tucumán", "Córdoba"), false);
  });

  it("una asociación sin provincia no ve ni modifica nada", () => {
    const decision = decidirAlcanceTorneo(
      { rol: "admin_provincial", provincia: null, clubId: null },
      { alcance: "Provincial", clubId: "club", provinciaClub: "Tucumán" },
      "ver",
    );
    assert.equal(decision.permitido, false);
    assert.match(decision.motivo || "", /provincia asignada/);
  });

  it("Tucumán edita lo suyo y el nacional queda en lectura", () => {
    const propio = decidirAlcanceTorneo(
      tucuman,
      { alcance: "Provincial", clubId: "club", provinciaClub: "Tucuman" },
      "editar",
    );
    const nacional = decidirAlcanceTorneo(
      tucuman,
      { alcance: "Nacional", clubId: "club", provinciaClub: "Buenos Aires" },
      "resultados",
    );
    const ajeno = decidirAlcanceTorneo(
      tucuman,
      { alcance: "Provincial", clubId: "otro", provinciaClub: "Córdoba" },
      "ver",
    );
    assert.equal(propio.permitido, true);
    assert.equal(propio.soloLectura, false);
    assert.equal(nacional.permitido, false);
    assert.equal(ajeno.permitido, false);
  });

  it("el club sede carga resultados de un nacional y no lo elimina", () => {
    const cuenta = { rol: "admin_club", provincia: null, clubId: "new-center" };
    const torneo = {
      alcance: "Nacional",
      clubId: "new-center",
      provinciaClub: "Buenos Aires",
    };
    assert.equal(decidirAlcanceTorneo(cuenta, torneo, "resultados").permitido, true);
    assert.equal(decidirAlcanceTorneo(cuenta, torneo, "eliminar").permitido, false);
    assert.equal(
      decidirAlcanceTorneo(cuenta, { ...torneo, clubId: "otro" }, "ver").permitido,
      false,
    );
  });
});
