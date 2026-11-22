import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFapBracketForPairCount } from "../src/utils/fapBracketMatrices.ts";
import {
  buildFeedersByMatchNo,
  partidoViolaFeederODescansoPublicado,
  seleccionarPartidosLlaveParaAutoprogramar,
} from "../src/utils/programacionPartidos.ts";
import {
  detectarLlaveAntesFinZonaAlimentadora,
  partidoYaFinalizado,
} from "../src/utils/programacionZonaLlave.ts";

describe("TOR-49 falsos positivos horarios publicados", () => {
  it("partidoYaFinalizado reconoce estado Finalizado", () => {
    assert.equal(partidoYaFinalizado({ estado_partido: "Finalizado" }), true);
    assert.equal(partidoYaFinalizado({ estado_partido: "Programado" }), false);
  });

  it("no avisa por partidos de llave ya finalizados con programacion publicada", () => {
    const partidos = [
      {
        id: "qf",
        ronda: "CUARTOS",
        orden: 58,
        equipo_a_id: "a",
        equipo_b_id: "b",
        estado_partido: "Finalizado",
        cancha_asignada: "C1",
        fecha_partido: "2026-11-22T10:00:00.000Z",
      },
      {
        id: "sf",
        ronda: "SEMIS",
        orden: 60,
        equipo_a_id: "c",
        equipo_b_id: "d",
        estado_partido: "Programado",
        cancha_asignada: "C1",
        fecha_partido: "2026-11-22T10:30:00.000Z",
      },
    ];
    const { avisos_programacion_publicada } =
      seleccionarPartidosLlaveParaAutoprogramar(partidos, {
        programacionPublicada: true,
        violaHorarioPublicado: () => true,
      });
    assert.equal(avisos_programacion_publicada.length, 1);
    assert.doesNotMatch(avisos_programacion_publicada[0], /#58|qf/i);
  });

  it("no marca conflicto llave-zona si la zona ya cerro clasificacion", () => {
    const matrix = getFapBracketForPairCount(16) || [];
    const feeders = buildFeedersByMatchNo(matrix);
    const cruzaZonaA = matrix.find((m) => m.a === "1A" || m.b === "1A");
    assert.ok(cruzaZonaA);

    const partidos = [
      {
        id: "za1",
        ronda: "Zona A",
        orden: 1,
        equipo_a_id: "e1",
        equipo_b_id: "e2",
        estado_partido: "Finalizado",
        cancha_asignada: "C1",
        fecha_partido: "2026-11-22T18:00:00.000Z",
      },
      {
        id: "za2",
        ronda: "Zona A",
        orden: 2,
        equipo_a_id: "e3",
        equipo_b_id: "e4",
        estado_partido: "Finalizado",
        cancha_asignada: "C1",
        fecha_partido: "2026-11-22T19:30:00.000Z",
      },
      {
        id: "oct",
        ronda: "OCTAVOS",
        orden: cruzaZonaA.matchNo,
        equipo_a_id: "e5",
        equipo_b_id: "e6",
        estado_partido: "Programado",
        cancha_asignada: "C2",
        fecha_partido: "2026-11-22T12:00:00.000Z",
      },
    ];

    const conflictos = detectarLlaveAntesFinZonaAlimentadora(
      partidos,
      matrix,
      feeders,
      { duracionZonaMinutos: 90 },
    );
    assert.equal(conflictos.length, 0);
  });

  it("no exige orden respecto a feeders ya finalizados", () => {
    const partidos = [
      {
        id: "qf1",
        ronda: "CUARTOS",
        orden: 57,
        equipo_a_id: "a",
        equipo_b_id: "b",
        estado_partido: "Finalizado",
        cancha_asignada: "C1",
        fecha_partido: "2026-11-22T10:00:00.000Z",
      },
      {
        id: "qf2",
        ronda: "CUARTOS",
        orden: 58,
        equipo_a_id: "c",
        equipo_b_id: "d",
        estado_partido: "Finalizado",
        cancha_asignada: "C2",
        fecha_partido: "2026-11-22T10:00:00.000Z",
      },
      {
        id: "sf",
        ronda: "SEMIS",
        orden: 59,
        equipo_a_id: "a",
        equipo_b_id: "c",
        estado_partido: "Programado",
        cancha_asignada: "C1",
        fecha_partido: "2026-11-22T17:00:00.000Z",
      },
    ];

    const feeders = new Map<number, number[]>([[59, [57, 58]]]);
    const viola = partidoViolaFeederODescansoPublicado(
      partidos[2],
      partidos,
      feeders,
      90,
    );
    assert.equal(viola, false);

    const { avisos_programacion_publicada } =
      seleccionarPartidosLlaveParaAutoprogramar(partidos, {
        programacionPublicada: true,
        violaHorarioPublicado: (p) =>
          partidoViolaFeederODescansoPublicado(
            p as (typeof partidos)[0],
            partidos,
            feeders,
            90,
          ),
      });
    assert.equal(avisos_programacion_publicada.length, 0);
  });
});