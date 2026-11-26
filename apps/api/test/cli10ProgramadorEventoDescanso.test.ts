import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  mapaJugadoresUsuarioPorPartidoEvento,
  validarSolapesAgendaCompartida,
} from "../src/utils/programacionEvento.ts";
import { parejasProspectivasDesdeFeeders } from "../src/utils/programacionPartidos.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-10 descanso entre categorías con Por definir", () => {
  it("autoAsignar integra restricciones de jugador del evento", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(svc, /restriccionesJugadorEventoParaAutoAsignar/);
    assert.match(svc, /\.\.\.eventoJugadorRest/);
  });

  it("mapaJugadores enriquece llave sin equipos desde feeders de zona", async () => {
    const feeders = new Map<number, number[]>([
      [61, [58, 59]],
    ]);
    const partidos = [
      {
        id: "z58",
        torneo_id: "t1",
        ronda: "ZONA A",
        orden: 58,
        equipo_a_id: "insc-a1",
        equipo_b_id: "insc-a2",
      },
      {
        id: "ll61",
        torneo_id: "t1",
        ronda: "OCTAVOS",
        orden: 61,
        equipo_a_id: null,
        equipo_b_id: null,
      },
    ] as const;

    const prospectivas = parejasProspectivasDesdeFeeders(
      partidos[1],
      [...partidos],
      feeders,
    );
    assert.deepEqual(prospectivas.sort(), ["insc-a1", "insc-a2"].sort());

    const util = readFileSync(
      path.join(RAIZ, "src/utils/programacionEvento.ts"),
      "utf8",
    );
    assert.match(util, /parejasProspectivasDesdeFeeders/);
    assert.match(
      mapaJugadoresUsuarioPorPartidoEvento.toString(),
      /parejasProspectivasDesdeFeeders/,
    );
  });

  it("validarSolapes detecta descanso con jugadores proyectados en llave", () => {
    const uid = "jugador-cli10";

    const partidos = [
      {
        id: "p-z",
        torneo_id: "t-cat-a",
        ronda: "ZONA A",
        orden: 58,
        equipo_a_id: "insc-z",
        equipo_b_id: "insc-z2",
        cancha_asignada: "Club - 1",
        fecha_partido: "2026-11-28T15:00:00.000Z",
      },
      {
        id: "p-l",
        torneo_id: "t-cat-b",
        ronda: "OCTAVOS",
        orden: 10,
        equipo_a_id: null,
        equipo_b_id: null,
        cancha_asignada: null,
        fecha_partido: null,
      },
    ];

    const jugadoresPorPartido = new Map<string, string[]>([
      ["p-z", [uid]],
      ["p-l", [uid]],
    ]);

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p-l",
      "Club - 2",
      "2026-11-28T16:30:00.000Z",
      {
        duracionMinutos: 90,
        descansoMinutos: 60,
        jugadoresPorPartido,
      },
    );
    assert.equal(
      msg,
      "Descanso insuficiente para un jugador inscripto en otra categoría",
    );
  });

  it("parejasProspectivas propagan zonas feeder sin equipos en destino", () => {
    const feeders = new Map<number, number[]>([[20, [11, 12]]]);
    const todos = [
      {
        id: "p11",
        ronda: "ZONA B",
        orden: 11,
        equipo_a_id: "i1",
        equipo_b_id: "i2",
      },
      {
        id: "p12",
        ronda: "ZONA C",
        orden: 12,
        equipo_a_id: "i3",
        equipo_b_id: "i4",
      },
      { id: "p20", ronda: "CUARTOS", orden: 20 },
    ];
    const ids = parejasProspectivasDesdeFeeders(todos[2], todos, feeders);
    assert.equal(ids.length, 4);
  });
});