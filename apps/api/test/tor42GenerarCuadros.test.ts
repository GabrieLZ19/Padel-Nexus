import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-42 programación al generar cuadros", () => {
  it("generarFaseGrupos usa programarLlaveInicialTrasZonasFap en lugar de programar llave aislada", () => {
    const competencia = readFileSync(
      path.join(RAIZ, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(competencia, /programarLlaveInicialTrasZonasFap/);
    assert.doesNotMatch(
      competencia,
      /programarPartidosConDisponibilidad\(torneoId, playoffPartidos,\s*\{\s*fase: "llave"/,
    );
  });

  it("programarLlaveInicialTrasZonasFap aplica fin de zonas y último día de juego", () => {
    const prog = readFileSync(
      path.join(RAIZ, "src/utils/programacionPartidos.ts"),
      "utf8",
    );
    assert.match(prog, /export async function programarLlaveInicialTrasZonasFap/);
    assert.match(prog, /finWallClockTrasPartidos/);
    assert.match(prog, /ultimoDia/);
    assert.match(prog, /notBeforeExtra: notBeforeTrasZonas/);
  });
});