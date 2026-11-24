import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFapBracketForPairCount } from "../src/utils/fapBracketMatrices.ts";
import { numerosVisiblesDePartidos } from "../src/utils/numerosVisiblesPartido.ts";
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

  it("re-test 24/11: cuarto #21 (sáb 08:00/09:30) y semi #24 (dom 14:00) sin aviso falso", () => {
    const matrix = getFapBracketForPairCount(16) || [];
    const feeders = buildFeedersByMatchNo(matrix);
    const zonas = ["A", "B", "C", "D"].flatMap((z) =>
      [1, 2, 3, 4].map((o) => ({
        id: `z${z}${o}`,
        ronda: `Zona ${z}`,
        orden: o,
        estado_partido: "Finalizado",
        equipo_a_id: `z${z}${o}a`,
        equipo_b_id: `z${z}${o}b`,
        ganador: `z${z}${o}a`,
        fecha_partido: "2026-11-28T18:00:00-03:00",
        cancha_asignada: "C1",
      })),
    );
    const llave = matrix.map((m) => ({
      id: `m${m.matchNo}`,
      ronda: m.round,
      orden: m.matchNo,
      estado_partido: "Programado",
      equipo_a_id: `cu${m.matchNo}a`,
      equipo_b_id: `cu${m.matchNo}b`,
    }));

    const cuarto58 = llave.find((p) => p.orden === 58);
    const cuarto59 = llave.find((p) => p.orden === 59);
    const oct57 = llave.find((p) => p.orden === 57);
    const semi61 = llave.find((p) => p.orden === 61);
    assert.ok(cuarto58 && cuarto59 && oct57 && semi61);

    cuarto58.fecha_partido = "2026-11-29T08:00:00-03:00";
    cuarto58.cancha_asignada = "C1";
    cuarto59.fecha_partido = "2026-11-29T09:30:00-03:00";
    cuarto59.cancha_asignada = "C2";
    cuarto59.estado_partido = "Finalizado";
    cuarto59.ganador = cuarto59.equipo_a_id;
    oct57.fecha_partido = "2026-11-29T07:00:00-03:00";
    oct57.estado_partido = "Finalizado";
    oct57.ganador = oct57.equipo_a_id;
    semi61.fecha_partido = "2026-11-30T14:00:00-03:00";
    semi61.cancha_asignada = "C1";
    semi61.equipo_a_id = cuarto58.equipo_a_id;

    const todos = [...zonas, ...llave];
    const visibles = numerosVisiblesDePartidos(todos);
    assert.equal(visibles.get(String(cuarto58.id)), 21);
    assert.equal(visibles.get(String(semi61.id)), 24);

    const opts = { descansoModo: "tras_fin_120" as const };
    assert.equal(
      partidoViolaFeederODescansoPublicado(
        cuarto58,
        todos,
        feeders,
        90,
        opts,
      ),
      false,
    );
    assert.equal(
      partidoViolaFeederODescansoPublicado(semi61, todos, feeders, 90, opts),
      false,
    );

    const { avisos_programacion_publicada } =
      seleccionarPartidosLlaveParaAutoprogramar(llave, {
        programacionPublicada: true,
        violaHorarioPublicado: (p) =>
          partidoViolaFeederODescansoPublicado(
            p,
            todos,
            feeders,
            90,
            opts,
          ),
        partidosNumeracion: todos,
      });
    assert.equal(avisos_programacion_publicada.length, 0);
  });
});