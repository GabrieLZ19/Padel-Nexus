import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  esDniPrueba,
  esJugadorDePrueba,
  esVisibleEnSitioPublico,
} from "../src/utils/datoPrueba.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-28 exclusion QA en rankings", () => {
  it("detecta DNIs y nombres del re-test QA", () => {
    assert.equal(esDniPrueba("99000301"), true);
    assert.equal(esDniPrueba("99000116"), true);
    assert.equal(esDniPrueba("99002432"), true);
    assert.equal(esDniPrueba("99002433"), false);
    assert.equal(esDniPrueba("30123456"), false);
    assert.equal(
      esJugadorDePrueba({
        nombre: "QA",
        apellido: "PRUEBA, Jugador 02",
        email: "qa@test.com",
        rol: "usuario",
      }),
      true,
    );
    assert.equal(
      esJugadorDePrueba({
        nombre: "QA",
        apellido: "Ensayo Uno",
        email: "real@gmail.com",
        rol: "usuario",
      }),
      true,
    );
  });

  it("filtra filas QA igual que el listado público de ranking", () => {
    const filas = [
      {
        usuario_id: "qa-1",
        perfiles: {
          nombre: "QA",
          apellido: "PRUEBA, Llave Cinco",
          email: "qa.padel@test.com",
          dni: "99000305",
          rol: "usuario",
        },
      },
      {
        usuario_id: "ok-1",
        perfiles: {
          nombre: "Juan",
          apellido: "Pérez",
          email: "juan@gmail.com",
          dni: "28123456",
          rol: "usuario",
        },
      },
    ];
    const visibles = filas.filter((f) =>
      esVisibleEnSitioPublico(f.perfiles),
    );
    assert.equal(visibles.length, 1);
    assert.equal(visibles[0]?.usuario_id, "ok-1");
  });

  it("ranking.service y panel usan esVisibleEnSitioPublico / esJugadorDePrueba", () => {
    const ranking = readFileSync(
      path.join(RAIZ, "src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(ranking, /esVisibleEnSitioPublico\(jugador\.perfiles\)/);
    assert.match(ranking, /esTorneoDePrueba/);

    const panel = readFileSync(
      path.join(RAIZ, "src/services/panelJugador.service.ts"),
      "utf8",
    );
    assert.match(panel, /esJugadorDePrueba\(perfil\)/);
  });
});