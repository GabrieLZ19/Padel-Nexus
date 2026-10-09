import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asignarHorariosAPartidos,
  evaluateProgramacionIssues,
  generarSlotsDesdeSedesYVentana,
  parseFechaPartidoIsoPublic,
  type DisponibilidadTorneo,
  type PartidoProgramable,
} from "../src/utils/programacionPartidos";
import {
  clasificacionSuperaLimite,
  etiquetaRondaProgramador,
  evaluarDescansoInsuficiente,
  jornadasDesdeInicio,
  ordenDeAsignacion,
  ordenRondaProgramador,
  sugerirCanchasYHoras,
} from "../src/utils/programadorReglas";

const RONDAS = ["32AVOS", "16AVOS", "OCTAVOS", "CUARTOS", "SEMIS", "FINAL"] as const;

describe("programador paso 5", () => {
  it("etiqueta la llave en español y no usa PRELIMINAR ni 8vos", () => {
    assert.equal(etiquetaRondaProgramador("32AVOS"), "Treintaidosavos de final");
    assert.equal(etiquetaRondaProgramador("16AVOS"), "Dieciseisavos de final");
    assert.equal(etiquetaRondaProgramador("OCTAVOS"), "Octavos de final");
    assert.equal(etiquetaRondaProgramador("CUARTOS"), "Cuartos de final");
    assert.equal(etiquetaRondaProgramador("SEMIS"), "Semifinales");
    assert.equal(etiquetaRondaProgramador("FINAL"), "Final");
    assert.equal(etiquetaRondaProgramador("ZONA A"), "Zona A");
    assert.equal(etiquetaRondaProgramador("PRELIMINARES"), "Ronda inicial");

    for (const ronda of [...RONDAS, "PRELIMINARES"]) {
      const etiqueta = etiquetaRondaProgramador(ronda);
      assert.equal(/preliminar/i.test(etiqueta), false);
      assert.equal(/8vos/i.test(etiqueta), false);
    }
  });

  it("ordena octavos, cuartos, semifinales y final", () => {
    const orden = ["OCTAVOS", "CUARTOS", "SEMIS", "FINAL"].map(ordenRondaProgramador);
    assert.deepEqual(
      [...orden].sort((a, b) => a - b),
      orden,
    );
    assert.ok(ordenRondaProgramador("32AVOS") < ordenRondaProgramador("16AVOS"));
    assert.ok(ordenRondaProgramador("16AVOS") < ordenRondaProgramador("OCTAVOS"));
    assert.ok(ordenRondaProgramador("ZONA A") < ordenRondaProgramador("ZONA B"));
    assert.ok(ordenRondaProgramador("ZONA B") < ordenRondaProgramador("OCTAVOS"));
  });

  it("zonas primero deja la llave al final y la continua respeta el orden del partido", () => {
    const partidos = [
      { id: "octavos", ronda: "OCTAVOS", orden: 1 },
      { id: "zona", ronda: "ZONA A", orden: 2 },
    ];
    assert.deepEqual(
      ordenDeAsignacion(partidos, "zonas_primero").map((p) => p.id),
      ["zona", "octavos"],
    );
    assert.deepEqual(
      ordenDeAsignacion(partidos, "continua").map((p) => p.id),
      ["octavos", "zona"],
    );
  });

  it("aplica los tres descansos: 60 o 120 desde el final, o 4 h entre inicios", () => {
    const inicio = 10 * 60;
    const duracion = 90;
    assert.equal(
      evaluarDescansoInsuficiente("tras_fin_60", inicio, inicio + 90, duracion),
      true,
    );
    assert.equal(
      evaluarDescansoInsuficiente("tras_fin_60", inicio, inicio + 150, duracion),
      false,
    );
    assert.equal(
      evaluarDescansoInsuficiente("tras_fin_120", inicio, inicio + 200, duracion),
      true,
    );
    assert.equal(
      evaluarDescansoInsuficiente("tras_fin_120", inicio, inicio + 210, duracion),
      false,
    );
    assert.equal(
      evaluarDescansoInsuficiente("entre_inicios_240", inicio, inicio + 180, duracion),
      true,
    );
    assert.equal(
      evaluarDescansoInsuficiente("entre_inicios_240", inicio, inicio + 240, duracion),
      false,
    );
  });

  it("la clasificación no puede terminar después de las 11:00 del día siguiente", () => {
    assert.equal(
      clasificacionSuperaLimite("2026-10-10", "2026-10-11T09:30:00", 90),
      false,
    );
    assert.equal(
      clasificacionSuperaLimite("2026-10-10", "2026-10-11T10:00:00", 90),
      true,
    );
    assert.equal(
      clasificacionSuperaLimite("2026-10-10", "2026-10-11T11:00:00", 60),
      true,
    );
  });

  it("arma de 1 a 4 jornadas desde la fecha inicial", () => {
    assert.deepEqual(jornadasDesdeInicio("2026-10-10", 1), ["2026-10-10"]);
    assert.deepEqual(jornadasDesdeInicio("2026-10-10", 4), [
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
    ]);
    assert.equal(jornadasDesdeInicio("2026-10-10", 9).length, 4);
  });

  it("estima canchas y horas a partir de los partidos", () => {
    const sugerencia = sugerirCanchasYHoras({
      partidos: 26,
      duracionMinutos: 90,
      jornadas: 1,
    });
    assert.equal(sugerencia.canchas, 2);
    assert.equal(sugerencia.horas, 20);
    assert.match(sugerencia.mensaje, /2 canchas/);
    assert.match(sugerencia.mensaje, /20 horas/);
  });

  it("asigna zonas antes que la llave, y la llave en orden de instancia", () => {
    const cancha: DisponibilidadTorneo = {
      club_id: "club-1",
      cancha_id: "cancha-1",
      fecha: "2026-10-10",
      hora_inicio: "08:00:00",
      clubes: { nombre: "Club" },
      canchas: { nombre: "1" },
    };
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [cancha],
      dias: ["2026-10-10"],
      duracionMinutos: 90,
      horaInicioMin: 8 * 60,
      horaFinMin: 16 * 60,
    });

    const zona: PartidoProgramable = {
      id: "zona",
      ronda: "ZONA A",
      orden: 9,
      estado_partido: "Pendiente",
    };
    const octavos: PartidoProgramable = {
      id: "octavos",
      ronda: "OCTAVOS",
      orden: 1,
      estado_partido: "Programado",
    };
    asignarHorariosAPartidos([octavos, zona], slots, new Set(), {
      duracionMinutos: 90,
      permitirSinEquipos: true,
    });
    const zonaMin = parseFechaPartidoIsoPublic(String(zona.fecha_partido))?.startMin;
    const octavosMin = parseFechaPartidoIsoPublic(String(octavos.fecha_partido))?.startMin;
    assert.equal(zonaMin, 8 * 60);
    assert.equal(octavosMin, 8 * 60 + 90);

    const llave: PartidoProgramable[] = [
      { id: "cuartos", ronda: "CUARTOS", orden: 1, estado_partido: "Programado" },
      { id: "final", ronda: "FINAL", orden: 2, estado_partido: "Programado" },
      { id: "octavos-llave", ronda: "OCTAVOS", orden: 3, estado_partido: "Programado" },
      { id: "semis", ronda: "SEMIS", orden: 4, estado_partido: "Programado" },
    ];
    asignarHorariosAPartidos(llave, slots, new Set(), {
      duracionMinutos: 90,
      permitirSinEquipos: true,
    });
    const porInicio = [...llave].sort(
      (a, b) =>
        (parseFechaPartidoIsoPublic(String(a.fecha_partido))?.startMin || 0) -
        (parseFechaPartidoIsoPublic(String(b.fecha_partido))?.startMin || 0),
    );
    assert.deepEqual(
      porInicio.map((p) => p.ronda),
      ["OCTAVOS", "CUARTOS", "SEMIS", "FINAL"],
    );
  });

  it("marca clasificación fuera de las 11:00 y el descanso de 4 h entre inicios", () => {
    const tarde = evaluateProgramacionIssues(
      [
        {
          id: "zona-tarde",
          ronda: "ZONA A",
          orden: 1,
          cancha_asignada: "Club - 1",
          fecha_partido: "2026-10-11T13:30:00.000Z",
          estado_partido: "Programado",
        },
      ],
      { duracionMinutos: 90, fechaInicio: "2026-10-10" },
    );
    assert.equal(
      tarde.some((i) => i.message.includes("11:00")),
      true,
    );

    const enLimite = evaluateProgramacionIssues(
      [
        {
          id: "zona-ok",
          ronda: "ZONA A",
          orden: 1,
          cancha_asignada: "Club - 1",
          fecha_partido: "2026-10-11T12:30:00.000Z",
          estado_partido: "Programado",
        },
      ],
      { duracionMinutos: 90, fechaInicio: "2026-10-10" },
    );
    assert.equal(
      enLimite.some((i) => i.message.includes("11:00")),
      false,
    );

    const llaveTarde = evaluateProgramacionIssues(
      [
        {
          id: "final-tarde",
          ronda: "FINAL",
          orden: 1,
          cancha_asignada: "Club - 1",
          fecha_partido: "2026-10-11T18:00:00.000Z",
          estado_partido: "Programado",
        },
      ],
      { duracionMinutos: 90, fechaInicio: "2026-10-10" },
    );
    assert.equal(
      llaveTarde.some((i) => i.message.includes("11:00")),
      false,
    );

    const corto = evaluateProgramacionIssues(
      [
        {
          id: "a",
          ronda: "OCTAVOS",
          orden: 1,
          equipo_a_id: "pareja-1",
          equipo_b_id: "pareja-2",
          cancha_asignada: "Club - 1",
          fecha_partido: "2026-10-10T13:00:00.000Z",
          estado_partido: "Programado",
        },
        {
          id: "b",
          ronda: "CUARTOS",
          orden: 2,
          equipo_a_id: "pareja-1",
          equipo_b_id: "pareja-3",
          cancha_asignada: "Club - 2",
          fecha_partido: "2026-10-10T16:00:00.000Z",
          estado_partido: "Programado",
        },
      ],
      { duracionMinutos: 90, descansoModo: "entre_inicios_240" },
    );
    assert.equal(
      corto.some((i) => i.message.includes("4 h")),
      true,
    );

    const holgado = evaluateProgramacionIssues(
      [
        {
          id: "a",
          ronda: "OCTAVOS",
          orden: 1,
          equipo_a_id: "pareja-1",
          equipo_b_id: "pareja-2",
          cancha_asignada: "Club - 1",
          fecha_partido: "2026-10-10T13:00:00.000Z",
          estado_partido: "Programado",
        },
        {
          id: "b",
          ronda: "CUARTOS",
          orden: 2,
          equipo_a_id: "pareja-1",
          equipo_b_id: "pareja-3",
          cancha_asignada: "Club - 2",
          fecha_partido: "2026-10-10T16:00:00.000Z",
          estado_partido: "Programado",
        },
      ],
      { duracionMinutos: 90, descansoModo: "tras_fin_60" },
    );
    assert.equal(
      holgado.some((i) => i.severity === "bad" && i.message.includes("Descanso")),
      false,
    );
  });
});
