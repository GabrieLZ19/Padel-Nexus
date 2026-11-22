import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FapBracketMatch } from "../src/utils/fapBracketTypes.ts";
import { buildFeedersByMatchNo } from "../src/utils/programacionPartidos.ts";
import {
  detectarLlaveAntesFinZonaAlimentadora,
  zoneLettersQueAlimentanMatchNo,
} from "../src/utils/programacionZonaLlave.ts";
import { evaluateProgramacionIssues } from "../src/utils/programacionPartidos.ts";

const matrix: FapBracketMatch[] = [
  { matchNo: 23, a: "1E", b: "2F", winnerTo: 25 },
  { matchNo: 25, a: "W23", b: "W24", winnerTo: 27 },
];
const feeders = buildFeedersByMatchNo(matrix);

describe("TOR-48 horarios llave vs fin de zona", () => {
  it("detecta letras de zona que alimentan un cruce", () => {
    const letters = zoneLettersQueAlimentanMatchNo(25, matrix, feeders);
    assert.ok(letters.has("E"));
  });

  it("marca conflicto si la semi está antes del fin de la zona E", () => {
    const partidos = [
      {
        id: "z-e-2",
        ronda: "Zona E",
        orden: 2,
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-23T12:30:00.000Z",
      },
      {
        id: "semi-25",
        ronda: "SEMIS",
        orden: 25,
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-23T11:00:00.000Z",
      },
    ];

    const conflictos = detectarLlaveAntesFinZonaAlimentadora(
      partidos,
      matrix,
      feeders,
      { duracionZonaMinutos: 75, descansoMinutos: 60 },
    );
    assert.ok(conflictos.some((c) => c.partido_llave_id === "semi-25"));
    assert.ok(
      conflictos.some((c) => /zona E/i.test(c.message)),
    );
  });

  it("evaluateProgramacionIssues expone TOR-48 con matrix FAP", () => {
    const partidos = [
      {
        id: "z-e-1",
        ronda: "Zona E",
        orden: 1,
        cancha_asignada: "C",
        fecha_partido: "2026-11-23T15:00:00.000Z",
      },
      {
        id: "cuartos-23",
        ronda: "CUARTOS",
        orden: 23,
        cancha_asignada: "C",
        fecha_partido: "2026-11-23T11:00:00.000Z",
      },
    ];
    const issues = evaluateProgramacionIssues(partidos, {
      duracionMinutos: 90,
      duracionZonaMinutos: 75,
      descansoMinutos: 60,
      feedersByMatchNo: feeders,
      matrixFap: matrix,
    });
    assert.ok(
      issues.some(
        (i) =>
          i.partido_id === "cuartos-23" &&
          i.severity === "bad" &&
          /zona E/i.test(i.message),
      ),
    );
  });
});