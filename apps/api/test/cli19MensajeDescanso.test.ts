import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateProgramacionIssues,
  validarAsignacionHorarioPartido,
  type PartidoProgramable,
} from "../src/utils/programacionPartidos.ts";
import { mensajeDescansoInsuficienteProgramador } from "../src/utils/programadorReglas.ts";

describe("CLI-19 mensajes de descanso vs orden de llave", () => {
  it("mensajeDetalle: se exigen X min, hay Y min", () => {
    const msg = mensajeDescansoInsuficienteProgramador(
      "tras_fin_60",
      10 * 60,
      11 * 60 + 45,
      90,
    );
    assert.match(msg, /se exigen 45 min/);
    assert.match(msg, /hay 15 min/);
  });

  it("orden inválido: antes del fin del feeder, no mensaje de descanso", () => {
    const partidos: PartidoProgramable[] = [
      {
        id: "f",
        ronda: "CUARTOS",
        orden: 23,
        equipo_a_id: "a",
        equipo_b_id: "b",
        cancha_asignada: "C1",
        fecha_partido: "2026-12-01T10:00:00-03:00",
      },
      {
        id: "h",
        ronda: "SEMIS",
        orden: 25,
        equipo_a_id: "a",
        equipo_b_id: "c",
        cancha_asignada: "C2",
        fecha_partido: "2026-12-01T10:30:00-03:00",
      },
    ];
    const feeders = new Map<number, number[]>([[25, [23]]]);
    const issues = evaluateProgramacionIssues(partidos, {
      duracionMinutos: 90,
      descansoModo: "tras_fin_60",
      feedersByMatchNo: feeders,
    });
    const bad = issues.filter((i) => i.partido_id === "h");
    assert.ok(
      bad.some((i) => /Orden de llave inválido/.test(i.message)),
      `issues: ${bad.map((i) => i.message).join("; ")}`,
    );
    assert.ok(
      !bad.some((i) => /Descanso insuficiente/.test(i.message)),
    );
  });

  it("descanso insuficiente desde feeder con detalle", () => {
    const partidos: PartidoProgramable[] = [
      {
        id: "f",
        ronda: "CUARTOS",
        orden: 23,
        equipo_a_id: "a",
        equipo_b_id: "b",
        cancha_asignada: "C1",
        fecha_partido: "2026-12-01T10:00:00-03:00",
      },
      {
        id: "h",
        ronda: "SEMIS",
        orden: 25,
        equipo_a_id: "a",
        equipo_b_id: "c",
        cancha_asignada: "C1",
        fecha_partido: "2026-12-01T11:45:00-03:00",
      },
    ];
    const feeders = new Map<number, number[]>([[25, [23]]]);
    const issues = evaluateProgramacionIssues(partidos, {
      duracionMinutos: 90,
      descansoModo: "tras_fin_60",
      feedersByMatchNo: feeders,
    });
    const bad = issues.filter((i) => i.partido_id === "h");
    assert.ok(
      bad.some((i) => /Descanso insuficiente: se exigen/.test(i.message)),
    );
    assert.ok(bad.some((i) => /hay \d+ min/.test(i.message)));
  });

  it("validarAsignacionHorarioPartido: descanso, no orden de llave genérico", () => {
    const partidos: PartidoProgramable[] = [
      {
        id: "f",
        ronda: "CUARTOS",
        orden: 23,
        equipo_a_id: "a",
        equipo_b_id: "b",
        cancha_asignada: "C1",
        fecha_partido: "2026-12-01T10:00:00-03:00",
      },
      {
        id: "h",
        ronda: "SEMIS",
        orden: 25,
        equipo_a_id: "a",
        equipo_b_id: "c",
      },
    ];
    const feeders = new Map<number, number[]>([[25, [23]]]);
    const msg = validarAsignacionHorarioPartido(
      partidos,
      "h",
      "C1",
      "2026-12-01T11:45:00-03:00",
      {
        duracionMinutos: 90,
        descansoModo: "tras_fin_60",
        feedersByMatchNo: feeders,
      },
    );
    assert.ok(msg);
    assert.match(msg, /Descanso insuficiente/);
    assert.doesNotMatch(msg, /debe jugarse después del partido de origen/);
  });
});