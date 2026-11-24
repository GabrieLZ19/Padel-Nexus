import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import {
  ARCHIVO_PLANTILLA_CLUB_ASOC_PROVINCIAL,
  ARCHIVO_PLANTILLA_FEDERACION_NACIONAL,
  advertenciasResidenciaPlanilla,
  parseLocalidadProvinciaCelda,
  parsearFilasPlanilla,
  resolverLugarResidenciaDesdePlanilla,
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

  it("parseLocalidadProvinciaCelda tolera coma", () => {
    assert.deepEqual(parseLocalidadProvinciaCelda("Plottier, Neuquén"), {
      localidad: "Plottier",
      provincia: "Neuquén",
    });
  });

  it("solo localidad: no la trata como provincia y infiere si es posible", () => {
    assert.deepEqual(parseLocalidadProvinciaCelda("Plottier"), {
      localidad: "Plottier",
      provincia: "Neuquén",
    });
    const fila: import("../src/utils/inscripcionPlanilla.ts").FilaPlanillaInscripcion =
      {
        fila: 3,
        apellidoNombre: "Test",
        dni: "12345678",
        localidadResidencia: "Plottier",
        provinciaResidencia: "Neuquén",
      };
    assert.equal(resolverLugarResidenciaDesdePlanilla(fila), "Plottier");
    assert.equal(resolverProvinciaDesdePlanilla(fila), "Neuquén");
  });

  it("localidad desconocida: queda localidad sin provincia ni advertencia evitable", () => {
    assert.deepEqual(parseLocalidadProvinciaCelda("Pueblo Ficticio"), {
      localidad: "Pueblo Ficticio",
    });
    const fila: import("../src/utils/inscripcionPlanilla.ts").FilaPlanillaInscripcion =
      {
        fila: 4,
        apellidoNombre: "Test",
        dni: "87654321",
        localidadResidencia: "Pueblo Ficticio",
      };
    assert.equal(resolverLugarResidenciaDesdePlanilla(fila), "Pueblo Ficticio");
    assert.equal(resolverProvinciaDesdePlanilla(fila), null);
    const avisos = advertenciasResidenciaPlanilla(fila);
    assert.equal(avisos.length, 1);
    assert.match(avisos[0]!, /Pueblo Ficticio/);
  });

  it("asigna fila Excel 1-index con encabezado en fila 1", () => {
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
      [1, "García, Juan", "30111222", "", "", "", "", "Plottier"],
    ];
    const { filas } = parsearFilasPlanilla(matrix);
    assert.equal(filas.length, 1);
    assert.equal(filas[0]?.fila, 2);
    assert.equal(filas[0]?.localidadResidencia, "Plottier");
    const avisos = advertenciasResidenciaPlanilla(filas[0]!);
    assert.equal(avisos.length, 0);
  });

  it("infiere Neuquen desde Cutral Co y Zapala", () => {
    for (const loc of ["Cutral Co", "Zapala"]) {
      const parsed = parseLocalidadProvinciaCelda(loc);
      assert.equal(parsed.localidad, loc);
      assert.equal(parsed.provincia, "Neuquén");
    }
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
