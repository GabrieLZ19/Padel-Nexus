import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-12 / CLI-13 programador maestro UI", () => {
  it("encabezado muestra nombre del evento y capacidad del evento", () => {
    const top = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ProgramadorTopBar.tsx"),
      "utf8",
    );
    assert.match(top, /nombreEvento/);
    assert.match(top, /resumenCapacidad/);
    assert.match(top, /Programador maestro/);

    const page = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ProgramadorVisualPage.tsx"),
      "utf8",
    );
    assert.match(page, /partidos del evento asignados/);
    assert.match(page, /nombreEventoCabecera/);
  });

  it("filtro por sede y celdas de otra categoría atenuadas", () => {
    const filtro = readFileSync(
      path.join(RAIZ, "components/torneos/programador/EventoCategoriaFilter.tsx"),
      "utf8",
    );
    assert.match(filtro, /filtroClubId/);
    assert.match(filtro, /Todas las sedes/);

    const grid = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ScheduleGrid.tsx"),
      "utf8",
    );
    assert.match(grid, /filtroClubId/);
    assert.match(grid, /OcupacionAjenaCard/);
    assert.match(grid, /Otra categoría/);
  });
});