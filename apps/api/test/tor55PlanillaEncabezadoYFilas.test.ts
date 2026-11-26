import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  esFilaEncabezadoPlanilla,
  parsearFilasPlanilla,
} from "../src/utils/inscripcionPlanilla.ts";

describe("TOR-55 / CLI-1 encabezado de planilla", () => {
  it("rechaza fila nota suelta que menciona DNI", () => {
    assert.equal(
      esFilaEncabezadoPlanilla([
        "Importante: adjuntar fotocopia de DNI de cada jugador",
      ]),
      false,
    );
  });

  it("acepta encabezado con DNI y APELLIDO", () => {
    assert.equal(
      esFilaEncabezadoPlanilla(["PAREJAS", "APELLIDO y NOMBRE", "DNI"]),
      true,
    );
  });

  it("error claro si no hay encabezado válido", () => {
    assert.throws(
      () =>
        parsearFilasPlanilla([
          ["Recordatorio: completar DNI"],
          ["", "García", "123"],
        ]),
      /No se encontró el encabezado de la planilla/,
    );
  });

  it("encabezado en fila 5 (Excel): datos con fila 6", () => {
    const matrix = [
      ["", ""],
      ["INSCRIPCIÓN"],
      ["", ""],
      ["", ""],
      ["PAREJAS", "APELLIDO y NOMBRE", "DNI", "EMAIL"],
      [1, "Pérez, Ana", "30111222", "a@mail.com"],
    ];
    const { filas } = parsearFilasPlanilla(matrix);
    assert.equal(filas.length, 1);
    assert.equal(filas[0]?.fila, 6);
    assert.equal(filas[0]?.dni, "30111222");
  });
});