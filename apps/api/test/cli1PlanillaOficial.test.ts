import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import {
  ARCHIVO_PLANTILLA_CLUB_ASOC_PROVINCIAL,
  ARCHIVO_PLANTILLA_FEDERACION_NACIONAL,
  parseLocalidadProvinciaCelda,
  parsearFilasPlanilla,
  resolverProvinciaDesdePlanilla,
} from "../src/utils/inscripcionPlanilla.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(RAIZ, "test/fixtures/planillas");

function leerMatrixXls(nombre: string): unknown[][] {
  const p = path.join(FIX, nombre);
  const wb = XLSX.read(fs.readFileSync(p));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
}

describe("CLI-1 planillas oficiales FAP / clubes", () => {
  it("archivos fixture existen", () => {
    assert.ok(fs.existsSync(path.join(FIX, ARCHIVO_PLANTILLA_FEDERACION_NACIONAL)));
    assert.ok(
      fs.existsSync(path.join(FIX, ARCHIVO_PLANTILLA_CLUB_ASOC_PROVINCIAL)),
    );
  });

  it("detecta tipo fap vs general en plantillas vacías", () => {
    const fed = parsearFilasPlanilla(
      leerMatrixXls(ARCHIVO_PLANTILLA_FEDERACION_NACIONAL),
    );
    const club = parsearFilasPlanilla(
      leerMatrixXls(ARCHIVO_PLANTILLA_CLUB_ASOC_PROVINCIAL),
    );
    assert.equal(fed.tipo, "fap");
    assert.equal(club.tipo, "general");
  });

  it("lee PAREJAS y LOCALIDAD | PROVINCIA (typo LCOALIDAD)", () => {
    const matrix = [
      [
        "PAREJAS",
        "APELLIDO y NOMBRE",
        "DNI",
        "FECHA NACIM",
        "CATEGORIA",
        "EMAIL",
        "TELEFONO",
        "LCOALIDAD | PROVINCIA",
      ],
      [
        1,
        "García, Juan",
        "30111222",
        "15/03/1990",
        "4ta",
        "",
        "",
        "Yerba Buena | Tucumán",
      ],
      ["", "López, María", "28999888", "", "", "", "", ""],
    ];
    const { filas } = parsearFilasPlanilla(matrix);
    assert.equal(filas.length, 2);
    assert.equal(filas[0]?.letraOrden, "1");
    assert.equal(filas[1]?.letraOrden, "1");
    assert.equal(filas[0]?.localidadResidencia, "Yerba Buena");
    assert.equal(filas[0]?.provinciaResidencia, "Tucumán");
    assert.equal(
      resolverProvinciaDesdePlanilla(filas[0]!),
      "Tucumán",
    );
    assert.equal(filas[0]?.direccion, "Yerba Buena, Tucumán");
  });

  it("parseLocalidadProvinciaCelda tolera pipe", () => {
    assert.deepEqual(
      parseLocalidadProvinciaCelda("San Miguel | Buenos Aires"),
      { localidad: "San Miguel", provincia: "Buenos Aires" },
    );
  });

  it("planilla nacional conserva LETRA y ASOCIACIÓN", () => {
    const matrix = [
      [
        "LETRA",
        "ASOCIACIÓN",
        "APELLIDO y NOMBRE",
        "DNI",
        "FECHA NACIM",
        "CATEGORIA",
        "EMAIL",
        "TELEFONO",
        "DIRECCIÓN",
      ],
      ["A", "Buenos Aires", "Pérez, Tomás", "40111222", "", "2da", "", "", ""],
      ["", "", "Ruiz, Ana", "38999000", "", "", "", "", ""],
    ];
    const { tipo, filas } = parsearFilasPlanilla(matrix);
    assert.equal(tipo, "fap");
    assert.equal(filas.length, 2);
    assert.equal(filas[0]?.letraOrden, "A");
    assert.equal(filas[1]?.letraOrden, "A");
    assert.equal(filas[0]?.asociacion, "Buenos Aires");
    assert.equal(resolverProvinciaDesdePlanilla(filas[0]!), "Buenos Aires");
  });
});
