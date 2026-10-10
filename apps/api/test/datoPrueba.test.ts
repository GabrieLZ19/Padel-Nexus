import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  esJugadorDePrueba,
  esNombreDePrueba,
  esTorneoDePrueba,
  esVisibleEnSitioPublico,
} from "../src/utils/datoPrueba";

describe("datos de prueba del sitio público", () => {
  it("reconoce torneos de ensayo por el nombre o por la marca", () => {
    assert.equal(esNombreDePrueba("prueba programacion"), true);
    assert.equal(esNombreDePrueba("prueaba 2"), true);
    assert.equal(esNombreDePrueba("QA FAP · 32 parejas · Visual"), true);
    assert.equal(esNombreDePrueba("testing"), true);
    assert.equal(esNombreDePrueba("Open Demo 16 jugadores"), true);
    assert.equal(esNombreDePrueba("AUDITORIA UX - borrador de prueba"), true);
    assert.equal(esNombreDePrueba("asdfadsf"), true);
    assert.equal(esNombreDePrueba("Masters"), false);
    assert.equal(
      esTorneoDePrueba({ nombre: "Masters", es_prueba: true }),
      true,
    );
  });

  it("reconoce jugadores de ensayo por el correo, el nombre o la marca", () => {
    assert.equal(
      esJugadorDePrueba({
        nombre: "José",
        apellido: "Carrasco",
        email: "preinscripto+22377823@padelnexus.local",
      }),
      true,
    );
    assert.equal(
      esJugadorDePrueba({
        nombre: "Whapy",
        apellido: "Team",
        email: "team@whapy.com",
      }),
      true,
    );
    assert.equal(
      esJugadorDePrueba({
        nombre: "Bruno",
        apellido: "Fernandez",
        email: "bruno.fernandez.prueba@email.com",
      }),
      true,
    );
    assert.equal(
      esJugadorDePrueba({
        nombre: "Gabriel",
        apellido: "Lazo",
        email: "gabriellazo48@gmail.com",
      }),
      false,
    );
    assert.equal(
      esVisibleEnSitioPublico({
        nombre: "New Center",
        apellido: "Administrador",
        email: "newcenter@padelnexus.com",
        rol: "admin_club",
      }),
      false,
    );
  });
});
