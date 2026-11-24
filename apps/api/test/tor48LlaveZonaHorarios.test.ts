import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FapBracketMatch } from "../src/utils/fapBracketTypes.ts";
import {
  asignarHorariosAPartidos,
  buildFeedersByMatchNo,
  buildOcupadosDesdePartidos,
  evaluateProgramacionIssues,
  generarSlotsDesdeSedesYVentana,
  type DisponibilidadTorneo,
  type PartidoProgramable,
} from "../src/utils/programacionPartidos.ts";
import {
  detectarLlaveAntesFinZonaAlimentadora,
  detectarOrdenInternoZonaCuatro,
  detectarZonaDespuesInicioLlaveDependiente,
  mapInicioTempranoLlavePorZona,
  zoneLettersQueAlimentanMatchNo,
} from "../src/utils/programacionZonaLlave.ts";

const matrix: FapBracketMatch[] = [
  { matchNo: 19, a: "1E", b: "2A", winnerTo: 23 },
  { matchNo: 23, a: "W19", b: "2F", winnerTo: 25 },
  { matchNo: 25, a: "W23", b: "W24", winnerTo: 27 },
];
const feeders = buildFeedersByMatchNo(matrix);

const canchaBase: DisponibilidadTorneo = {
  club_id: "club-1",
  cancha_id: "c1",
  hora_inicio: "08:00:00",
  hora_fin: "23:59:59",
  clubes: { nombre: "QA Club" },
  canchas: { nombre: "1" },
};

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

  it("detecta partido de zona E después del cuarto #19 que depende de 1E", () => {
    const partidos = [
      {
        id: "z-e-gp",
        ronda: "Zona E",
        orden: 4,
        estado_partido: "Pendiente Perdedores",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-28T15:00:00.000Z",
      },
      {
        id: "c19",
        ronda: "CUARTOS",
        orden: 19,
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-28T12:00:00.000Z",
      },
    ];
    const conflictos = detectarZonaDespuesInicioLlaveDependiente(
      partidos,
      matrix,
      feeders,
    );
    assert.ok(conflictos.some((c) => c.partido_zona_id === "z-e-gp"));
    const issues = evaluateProgramacionIssues(partidos, {
      duracionMinutos: 90,
      duracionZonaMinutos: 75,
      descansoMinutos: 60,
      feedersByMatchNo: feeders,
      matrixFap: matrix,
    });
    assert.ok(
      issues.some(
        (i) => i.partido_id === "z-e-gp" && i.severity === "bad",
      ),
    );
  });

  it("marca orden interno inválido en zona de 4 (G/P antes de la ola 1)", () => {
    const partidos = [
      {
        id: "ze1",
        ronda: "Zona E",
        orden: 1,
        equipo_a_id: "a",
        equipo_b_id: "b",
        estado_partido: "Programado",
        cancha_asignada: "C",
        fecha_partido: "2026-11-28T14:00:00.000Z",
      },
      {
        id: "ze2",
        ronda: "Zona E",
        orden: 2,
        equipo_a_id: "c",
        equipo_b_id: "d",
        estado_partido: "Programado",
        cancha_asignada: "C",
        fecha_partido: "2026-11-28T14:00:00.000Z",
      },
      {
        id: "ze3",
        ronda: "Zona E",
        orden: 3,
        estado_partido: "Pendiente Ganadores",
        cancha_asignada: "C",
        fecha_partido: "2026-11-28T10:00:00.000Z",
      },
      {
        id: "ze4",
        ronda: "Zona E",
        orden: 4,
        estado_partido: "Pendiente Perdedores",
        cancha_asignada: "C",
        fecha_partido: "2026-11-28T10:00:00.000Z",
      },
    ];
    const interno = detectarOrdenInternoZonaCuatro(partidos, {
      duracionZonaMinutos: 75,
      descansoMinutos: 60,
    });
    assert.ok(interno.some((c) => c.partido_zona_id === "ze3"));
  });

  it("Zona E ampliada a 4: programación respeta techo de cuarto #19 y orden interno", () => {
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [
        { ...canchaBase, fecha: "2026-11-28" },
        { ...canchaBase, fecha: "2026-11-29", cancha_id: "c2" },
      ],
      dias: ["2026-11-28", "2026-11-29"],
      duracionMinutos: 75,
    });

    const cuarto19: PartidoProgramable = {
      id: "c19",
      ronda: "CUARTOS",
      orden: 19,
      estado_partido: "Programado",
      cancha_asignada: "QA Club — 1",
      fecha_partido: "2026-11-28T16:00:00.000Z",
    };

    const zonaE: PartidoProgramable[] = [
      {
        id: "ze1",
        ronda: "Zona E",
        orden: 1,
        equipo_a_id: "p1",
        equipo_b_id: "p2",
        estado_partido: "Programado",
        cancha_asignada: "QA Club — 1",
        fecha_partido: "2026-11-28T08:00:00.000Z",
      },
      {
        id: "ze2",
        ronda: "Zona E",
        orden: 2,
        equipo_a_id: "p3",
        equipo_b_id: "p4",
        estado_partido: "Programado",
        cancha_asignada: "QA Club — 1",
        fecha_partido: "2026-11-28T08:00:00.000Z",
      },
      {
        id: "ze3",
        ronda: "Zona E",
        orden: 3,
        estado_partido: "Pendiente Ganadores",
      },
      {
        id: "ze4",
        ronda: "Zona E",
        orden: 4,
        estado_partido: "Pendiente Perdedores",
      },
    ];

    const todos = [...zonaE, cuarto19];
    const techo = mapInicioTempranoLlavePorZona(todos, matrix, feeders);
    assert.ok(techo.has("E"));

    const pendIds = new Set(["ze3", "ze4"]);
    asignarHorariosAPartidos(todos, slots, buildOcupadosDesdePartidos(todos), {
      duracionMinutos: 75,
      duracionZonaMinutos: 75,
      descansoMinutos: 60,
      notAfterLlavePorZona: techo,
      limitarAIds: pendIds,
    });

    assert.ok(zonaE[2].fecha_partido);
    assert.ok(zonaE[3].fecha_partido);

    const issues = evaluateProgramacionIssues(todos, {
      duracionMinutos: 90,
      duracionZonaMinutos: 75,
      descansoMinutos: 60,
      feedersByMatchNo: feeders,
      matrixFap: matrix,
    });
    const graves = issues.filter((i) => i.severity === "bad");
    assert.equal(
      graves.some((i) => /zona E|ganadores|perdedores|llave/i.test(i.message)),
      false,
    );
  });
});