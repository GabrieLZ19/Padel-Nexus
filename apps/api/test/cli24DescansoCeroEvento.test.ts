import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validarSolapesAgendaCompartida } from "../src/utils/programacionEvento.ts";

describe("CLI-24 descanso 0 y control cruzado entre categorías", () => {
  it("no marca conflicto de otra categoría para partidos seguidos de la misma categoría", () => {
    const partidos = [
      {
        id: "p1",
        torneo_id: "torneo-7a",
        ronda: "ZONA A",
        equipo_a_id: "pareja-1",
        equipo_b_id: "pareja-2",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-28T12:15:00.000Z", // 09:15 AR
        estado_partido: "Programado",
      },
      {
        id: "p2",
        torneo_id: "torneo-7a",
        ronda: "ZONA A",
        equipo_a_id: "pareja-1",
        equipo_b_id: "pareja-3",
        cancha_asignada: "Cancha 2",
        fecha_partido: "2026-11-28T13:15:00.000Z", // 10:15 AR
        estado_partido: "Programado",
      },
    ];
    const jugadoresPorPartido = new Map<string, string[]>([
      ["p1", ["jug-1", "jug-2"]],
      ["p2", ["jug-1", "jug-3"]],
    ]);

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p2",
      "Cancha 2",
      "2026-11-28T13:15:00.000Z",
      {
        duracionMinutos: 60,
        descansoMinutos: 60,
        jugadoresPorPartido,
      },
    );
    assert.equal(msg, null);
  });

  it("permite partidos seguidos en categorías distintas cuando descanso es 0", () => {
    const partidos = [
      {
        id: "p-6a",
        torneo_id: "torneo-6a",
        ronda: "ZONA A",
        equipo_a_id: "pareja-6a",
        equipo_b_id: "pareja-6b",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-28T12:15:00.000Z", // 09:15 AR
        estado_partido: "Programado",
      },
      {
        id: "p-7a",
        torneo_id: "torneo-7a",
        ronda: "ZONA A",
        equipo_a_id: "pareja-7a",
        equipo_b_id: "pareja-7b",
        cancha_asignada: "Cancha 2",
        fecha_partido: "2026-11-28T13:15:00.000Z", // 10:15 AR
        estado_partido: "Programado",
      },
    ];
    const jugadoresPorPartido = new Map<string, string[]>([
      ["p-6a", ["jug-compartida"]],
      ["p-7a", ["jug-compartida"]],
    ]);

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p-7a",
      "Cancha 2",
      "2026-11-28T13:15:00.000Z",
      {
        duracionMinutos: 60,
        descansoMinutos: 0,
        jugadoresPorPartido,
      },
    );
    assert.equal(msg, null);
  });

  it("bloquea partidos simultáneos en categorías distintas aunque descanso sea 0", () => {
    const partidos = [
      {
        id: "p-6a",
        torneo_id: "torneo-6a",
        ronda: "ZONA A",
        equipo_a_id: "pareja-6a",
        equipo_b_id: "pareja-6b",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-28T12:15:00.000Z",
        estado_partido: "Programado",
      },
      {
        id: "p-7a",
        torneo_id: "torneo-7a",
        ronda: "ZONA A",
        equipo_a_id: "pareja-7a",
        equipo_b_id: "pareja-7b",
        cancha_asignada: "Cancha 2",
        fecha_partido: "2026-11-28T12:45:00.000Z",
        estado_partido: "Programado",
      },
    ];
    const jugadoresPorPartido = new Map<string, string[]>([
      ["p-6a", ["jug-compartida"]],
      ["p-7a", ["jug-compartida"]],
    ]);

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p-7a",
      "Cancha 2",
      "2026-11-28T12:45:00.000Z",
      {
        duracionMinutos: 60,
        descansoMinutos: 0,
        jugadoresPorPartido,
      },
    );
    assert.equal(
      msg,
      "Jugador con partidos simultáneos en otra categoría del evento",
    );
  });

  it("respeta duracionPorDia (60 min sábado) aunque duracionMinutos general sea 90", () => {
    const partidos = [
      {
        id: "p-6a",
        torneo_id: "torneo-6a",
        ronda: "ZONA A",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-28T12:15:00.000Z", // 09:15 AR
        estado_partido: "Programado",
      },
      {
        id: "p-7a",
        torneo_id: "torneo-7a",
        ronda: "ZONA A",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-28T13:15:00.000Z", // 10:15 AR
        estado_partido: "Programado",
      },
    ];

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p-7a",
      "Cancha 1",
      "2026-11-28T13:15:00.000Z",
      {
        duracionMinutos: 90,
        descansoMinutos: 0,
        duracionPorDia: { "2026-11-28": 60 },
      },
    );
    assert.equal(msg, null);
  });
});
