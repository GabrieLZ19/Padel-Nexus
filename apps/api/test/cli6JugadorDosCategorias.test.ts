import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { validarSolapesAgendaCompartida } from "../src/utils/programacionEvento.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const JUGADOR_EVENTO = "usuario-evento-01";
const FECHA_0930 = "2026-11-28T12:30:00.000Z";

describe("CLI-6 jugador en dos categorías del evento", () => {
  it("validarAsignacionEnEvento resuelve jugadores por usuario_id", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/programacionEvento.ts"),
      "utf8",
    );
    assert.match(util, /mapaJugadoresUsuarioPorPartidoEvento/);
    assert.match(
      util,
      /validarAsignacionEnEvento[\s\S]*jugadoresPorPartido/,
    );
  });

  it("bloquea misma hora en otra categoría aunque la inscripción sea distinta", () => {
    const partidos = [
      {
        id: "p-6a",
        torneo_id: "torneo-6",
        ronda: "ZONA A",
        equipo_a_id: "insc-6a",
        equipo_b_id: "insc-6b",
        cancha_asignada: "QA Prueba Club - 1",
        fecha_partido: FECHA_0930,
        estado_partido: "Programado",
      },
      {
        id: "p-7a",
        torneo_id: "torneo-7",
        ronda: "ZONA A",
        equipo_a_id: "insc-7a",
        equipo_b_id: "insc-7b",
        cancha_asignada: null,
        fecha_partido: null,
        estado_partido: "Programado",
      },
    ];

    const jugadoresPorPartido = new Map<string, string[]>([
      ["p-6a", [JUGADOR_EVENTO]],
      ["p-7a", [JUGADOR_EVENTO]],
    ]);

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p-7a",
      "QA Prueba Club 2 - 1",
      FECHA_0930,
      {
        duracionMinutos: 90,
        descansoMinutos: 60,
        jugadoresPorPartido,
      },
    );

    assert.equal(
      msg,
      "Jugador con partidos simultáneos en otra categoría del evento",
    );
  });

  it("sin mapa de jugadores no detecta mismo usuario en otra inscripción", () => {
    const partidos = [
      {
        id: "p-6a",
        torneo_id: "torneo-6",
        ronda: "ZONA A",
        equipo_a_id: "insc-6a",
        equipo_b_id: "insc-6b",
        cancha_asignada: "Cancha 1",
        fecha_partido: FECHA_0930,
        estado_partido: "Programado",
      },
      {
        id: "p-7a",
        torneo_id: "torneo-7",
        ronda: "ZONA A",
        equipo_a_id: "insc-7a",
        equipo_b_id: "insc-7b",
        cancha_asignada: null,
        fecha_partido: null,
        estado_partido: "Programado",
      },
    ];

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p-7a",
      "Cancha 2",
      FECHA_0930,
      { duracionMinutos: 90 },
    );
    assert.equal(msg, null);
  });
});