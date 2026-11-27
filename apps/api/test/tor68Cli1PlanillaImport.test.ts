import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advertenciaNombreSinComaPlanilla,
  errorDniFilaPlanilla,
  erroresGrupoPlanillaImport,
  filaInicioExcelDesdeSheetRef,
  parsearFilasPlanilla,
  validarEstructuraPlanillaAntesImport,
} from "../src/utils/inscripcionPlanilla.ts";

describe("CLI-1 / TOR-68 importador de planilla", () => {
  it("filaInicioExcelDesdeSheetRef respeta !ref", () => {
    assert.equal(filaInicioExcelDesdeSheetRef("A5:H99"), 5);
    assert.equal(filaInicioExcelDesdeSheetRef(undefined), 1);
  });

  it("número de fila Excel con offset superior (encabezado en fila 5, dato en 6)", () => {
    const matrix = [
      ["PAREJAS", "APELLIDO y NOMBRE", "DNI"],
      [1, "García, Juan", "30111222"],
    ];
    const { filas } = parsearFilasPlanilla(matrix, { filaInicioExcel: 5 });
    assert.equal(filas.length, 1);
    assert.equal(filas[0]?.fila, 6);
  });

  it("TOR-68: distingue DNI vacío vs corto", () => {
    assert.match(
      errorDniFilaPlanilla({ fila: 8, apellidoNombre: "X", dni: "" })!,
      /vacío/,
    );
    assert.match(
      errorDniFilaPlanilla({ fila: 9, apellidoNombre: "X", dni: "123456" })!,
      /menos de 7 dígitos/,
    );
    assert.equal(
      errorDniFilaPlanilla({ fila: 10, apellidoNombre: "X", dni: "30111222" }),
      null,
    );
  });

  it("TOR-68: aviso nombre sin coma con vista previa", () => {
    const aviso = advertenciaNombreSinComaPlanilla({
      fila: 12,
      apellidoNombre: "Gomez Juan Carlos",
      dni: "30111222",
    });
    assert.ok(aviso);
    assert.match(aviso!, /Gomez, Juan Carlos/);
  });

  it("lista todos los DNI repetidos en validación", () => {
    const filas = [
      { fila: 10, apellidoNombre: "A, Uno", dni: "30111222" },
      { fila: 11, apellidoNombre: "B, Dos", dni: "30111222" },
      { fila: 12, apellidoNombre: "C, Tres", dni: "28999888" },
      { fila: 13, apellidoNombre: "D, Cuatro", dni: "28999888" },
    ];
    const { errores } = validarEstructuraPlanillaAntesImport(filas, false);
    const dup3011 = errores.filter((e) => e.includes("30111222"));
    const dup2899 = errores.filter((e) => e.includes("28999888"));
    assert.equal(dup3011.length, 2);
    assert.equal(dup2899.length, 2);
    assert.ok(errores.length >= 4);
  });

  it("erroresGrupoPlanillaImport bloquea pareja incompleta sin tocar fichas", () => {
    const filas = [{ fila: 20, apellidoNombre: "Solito, Juan", dni: "30111222" }];
    const errs = erroresGrupoPlanillaImport(
      { j1: filas[0]! },
      false,
      filas,
    );
    assert.ok(errs.some((e) => /incompleta/.test(e)));
  });
});