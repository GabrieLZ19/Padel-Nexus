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
  esRondaCampeonato,
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
    assert.equal(
      etiquetaRondaProgramador("PRELIMINARES"),
      "Dieciseisavos de final",
    );

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
    assert.equal(
      ordenRondaProgramador("PRELIMINARES"),
      ordenRondaProgramador("16AVOS"),
    );
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

  it("R1 - genera slots nocturnos hasta medianoche (00:00) y cubre rango ampliado", () => {
    const cancha: DisponibilidadTorneo = {
      club_id: "club-1",
      cancha_id: "cancha-1",
      fecha: "2026-10-10",
      hora_inicio: "08:00:00",
      clubes: { nombre: "Club" },
      canchas: { nombre: "1" },
    };

    // Caso 1: desde 08:00 con turno 90, el último inicio que termina a medianoche es 21:30
    // (22:30 no cae en la grilla 08:00+90n; 23:00 terminaría 00:30).
    const slotsDefault = generarSlotsDesdeSedesYVentana({
      canchas: [cancha],
      dias: ["2026-10-10"],
      duracionMinutos: 90,
    });
    const horasDefault = slotsDefault.map((s) => s.hora.slice(0, 5));
    assert.equal(horasDefault[0], "08:00");
    assert.equal(horasDefault.includes("21:30"), true);
    assert.equal(horasDefault.includes("23:00"), false);
    assert.equal(horasDefault.includes("00:00"), false);

    // Caso 2: franja 22:00–00:00 con turnos de 60 min → 22:00 y 23:00 (no arranca a las 00:00)
    const slotsMedianoche = generarSlotsDesdeSedesYVentana({
      canchas: [cancha],
      dias: ["2026-10-10"],
      duracionMinutos: 60,
      franjasPorDia: {
        "2026-10-10": { inicio: "22:00", fin: "00:00" },
      },
    });
    const horasMedianoche = slotsMedianoche.map((s) => s.hora.slice(0, 5));
    assert.deepEqual(horasMedianoche, ["22:00", "23:00"]);
    assert.equal(slotsMedianoche.some((s) => s.hora.startsWith("24:")), false);
    assert.equal(horasMedianoche.includes("00:00"), false);
  });

  it("R2 - genera franjas horarias de inicio y fin independientes por jornada", () => {
    const cancha: DisponibilidadTorneo = {
      club_id: "club-1",
      cancha_id: "cancha-1",
      fecha: "2026-10-09",
      hora_inicio: "08:00:00",
      clubes: { nombre: "Club" },
      canchas: { nombre: "1" },
    };

    // Ejemplo de la reunión:
    // Viernes: 18:00 a 00:00
    // Sábado: 10:00 a 00:00
    // Domingo: 11:00 a 20:00
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [cancha],
      dias: ["2026-10-09", "2026-10-10", "2026-10-11"],
      duracionMinutos: 90,
      franjasPorDia: {
        "2026-10-09": { inicio: "18:00", fin: "00:00" },
        "2026-10-10": { inicio: "10:00", fin: "00:00" },
        "2026-10-11": { inicio: "11:00", fin: "20:00" },
      },
    });

    const viernes = slots.filter((s) => s.fecha === "2026-10-09").map((s) => s.hora.slice(0, 5));
    const sabado = slots.filter((s) => s.fecha === "2026-10-10").map((s) => s.hora.slice(0, 5));
    const domingo = slots.filter((s) => s.fecha === "2026-10-11").map((s) => s.hora.slice(0, 5));

    // Viernes arranca a las 18:00; con 90 min el último inicio es 22:30 (no 00:00)
    assert.equal(viernes[0], "18:00");
    assert.deepEqual(viernes, ["18:00", "19:30", "21:00", "22:30"]);
    assert.equal(viernes.includes("08:00"), false);
    assert.equal(viernes.includes("10:00"), false);

    // Sábado arranca a las 10:00 y no incluye 08:00 ni 00:00
    assert.equal(sabado[0], "10:00");
    assert.equal(sabado.includes("08:00"), false);
    assert.equal(sabado.includes("00:00"), false);

    // Domingo arranca a las 11:00; último inicio que termina a las 20:00 es 18:30
    assert.equal(domingo[0], "11:00");
    assert.equal(domingo[domingo.length - 1], "18:30");
    assert.equal(domingo.includes("20:00"), false);
    assert.equal(domingo.includes("00:00"), false);
  });

  it("P2 - la disponibilidad por día gana sobre horaInicio global 08:00", () => {
    const canchas: DisponibilidadTorneo[] = [
      {
        club_id: "club-1",
        cancha_id: "cancha-1",
        fecha: "2026-11-27",
        hora_inicio: "18:00:00",
        hora_fin: "23:59:59",
        clubes: { nombre: "Club" },
        canchas: { nombre: "1" },
      },
    ];
    const slots = generarSlotsDesdeSedesYVentana({
      canchas,
      dias: ["2026-11-27"],
      duracionMinutos: 90,
      horaInicioMin: 8 * 60,
    });
    const horas = slots.map((s) => s.hora.slice(0, 5));
    assert.equal(horas[0], "18:00");
    assert.equal(horas.includes("08:00"), false);
    assert.deepEqual(horas, ["18:00", "19:30", "21:00", "22:30"]);
  });

  it("R3 - respeta descanso configurado de 120 min (tras fin) sin asignar en slots con descanso insuficiente", () => {
    const cancha: DisponibilidadTorneo = {
      club_id: "club-1",
      cancha_id: "cancha-1",
      fecha: "2026-10-30",
      hora_inicio: "08:00:00",
      clubes: { nombre: "Club" },
      canchas: { nombre: "1" },
    };

    // Slots disponibles cada 90 min: 08:00, 09:30, 11:00, 12:30, 14:00
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [cancha],
      dias: ["2026-10-30"],
      duracionMinutos: 90,
      horaInicioMin: 8 * 60,
      horaFinMin: 16 * 60,
    });

    const partidoA: PartidoProgramable = {
      id: "partido-1",
      ronda: "ZONA A",
      orden: 1,
      equipo_a_id: "pareja-1",
      equipo_b_id: "pareja-2",
      estado_partido: "Programado",
    };
    const partidoB: PartidoProgramable = {
      id: "partido-2",
      ronda: "ZONA A",
      orden: 2,
      equipo_a_id: "pareja-1",
      equipo_b_id: "pareja-3",
      estado_partido: "Programado",
    };

    // Con descanso 120 min:
    // Partido A a las 08:00 (termina 09:30).
    // A las 11:00 solo hay 90 min de descanso desde las 09:30 (insuficiente si se pide 120 min).
    // Por ende, debe saltearse 11:00 y asignarse a las 12:30 (180 min de descanso >= 120 min).
    asignarHorariosAPartidos([partidoA, partidoB], slots, new Set(), {
      duracionMinutos: 90,
      descansoModo: "tras_fin_120",
    });

    const inicioA = parseFechaPartidoIsoPublic(String(partidoA.fecha_partido))?.startMin;
    const inicioB = parseFechaPartidoIsoPublic(String(partidoB.fecha_partido))?.startMin;

    assert.equal(inicioA, 8 * 60); // 08:00
    assert.equal(inicioB, 12 * 60 + 30); // 12:30

    // Evaluamos los issues con descanso 120 min: no debe haber ningún conflicto de descanso
    const issues = evaluateProgramacionIssues([partidoA, partidoB], {
      duracionMinutos: 90,
      descansoModo: "tras_fin_120",
    });
    const issuesDescanso = issues.filter((i) => i.message.includes("Descanso"));
    assert.equal(issuesDescanso.length, 0);
  });

  it("R3 - respeta modo entre_inicios_240 al asignar partidos con descanso de 4 h", () => {
    const cancha: DisponibilidadTorneo = {
      club_id: "club-1",
      cancha_id: "cancha-1",
      fecha: "2026-10-30",
      hora_inicio: "08:00:00",
      clubes: { nombre: "Club" },
      canchas: { nombre: "1" },
    };

    // Slots disponibles cada 60 min desde 08:00
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [cancha],
      dias: ["2026-10-30"],
      duracionMinutos: 60,
      horaInicioMin: 8 * 60,
      horaFinMin: 16 * 60,
    });

    const partidoA: PartidoProgramable = {
      id: "partido-1",
      ronda: "ZONA A",
      orden: 1,
      equipo_a_id: "pareja-1",
      equipo_b_id: "pareja-2",
      estado_partido: "Programado",
    };
    const partidoB: PartidoProgramable = {
      id: "partido-2",
      ronda: "ZONA A",
      orden: 2,
      equipo_a_id: "pareja-1",
      equipo_b_id: "pareja-3",
      estado_partido: "Programado",
    };

    // Con descanso entre_inicios_240:
    // Partido A a las 08:00.
    // 08:00 + 4 h = 12:00. No puede asignarse antes de las 12:00.
    asignarHorariosAPartidos([partidoA, partidoB], slots, new Set(), {
      duracionMinutos: 60,
      descansoModo: "entre_inicios_240",
    });

    const inicioA = parseFechaPartidoIsoPublic(String(partidoA.fecha_partido))?.startMin;
    const inicioB = parseFechaPartidoIsoPublic(String(partidoB.fecha_partido))?.startMin;

    assert.equal(inicioA, 8 * 60); // 08:00
    assert.equal(inicioB, 12 * 60); // 12:00 (exactamente 240 min después)
  });

  it("R3 - respeta descanso de 120 min en partidos de llave dependientes de feeders", () => {
    const cancha: DisponibilidadTorneo = {
      club_id: "club-1",
      cancha_id: "cancha-1",
      fecha: "2026-10-30",
      hora_inicio: "08:00:00",
      clubes: { nombre: "Club" },
      canchas: { nombre: "1" },
    };

    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [cancha],
      dias: ["2026-10-30"],
      duracionMinutos: 90,
      horaInicioMin: 8 * 60,
      horaFinMin: 18 * 60,
    });

    const semi: PartidoProgramable = {
      id: "semi-1",
      ronda: "SEMIS",
      orden: 1,
      estado_partido: "Programado",
    };
    const final: PartidoProgramable = {
      id: "final-1",
      ronda: "FINAL",
      orden: 2,
      estado_partido: "Programado",
    };

    const feeders = new Map<number, number[]>();
    feeders.set(2, [1]); // Semi (1) alimenta a Final (2)

    asignarHorariosAPartidos([semi, final], slots, new Set(), {
      duracionMinutos: 90,
      descansoModo: "tras_fin_120",
      feedersByMatchNo: feeders,
      permitirSinEquipos: true,
    });

    const inicioSemi = parseFechaPartidoIsoPublic(String(semi.fecha_partido))?.startMin;
    const inicioFinal = parseFechaPartidoIsoPublic(String(final.fecha_partido))?.startMin;

    assert.equal(inicioSemi, 8 * 60); // 08:00 (termina 09:30)
    // Con 120 min descanso: 09:30 + 120 min = 11:30.
    // El slot de las 11:00 es inválido (< 11:30). Debe ser a las 12:30 o posterior.
    assert.ok((inicioFinal || 0) >= 12 * 60 + 30);
  });

  it("R3 - reconoce rondas de campeonato (semis y final) para distribuirlas en el último día", () => {
    assert.equal(esRondaCampeonato("SEMIS"), true);
    assert.equal(esRondaCampeonato("Semifinales"), true);
    assert.equal(esRondaCampeonato("FINAL"), true);
    assert.equal(esRondaCampeonato("Final"), true);
    assert.equal(esRondaCampeonato("CUARTOS"), false);
    assert.equal(esRondaCampeonato("OCTAVOS"), false);
    assert.equal(esRondaCampeonato("ZONA A"), false);
  });

  it("P2 - zona de 4 agenda #1/#2 antes que ganadores/perdedores y la llave después", () => {
    const cancha1: DisponibilidadTorneo = {
      club_id: "club-1",
      cancha_id: "c1",
      fecha: "2026-11-27",
      hora_inicio: "18:00:00",
      hora_fin: "23:59:59",
      clubes: { nombre: "Club" },
      canchas: { nombre: "1" },
    };
    const cancha2: DisponibilidadTorneo = {
      ...cancha1,
      cancha_id: "c2",
      canchas: { nombre: "2" },
    };
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [cancha1, cancha2],
      dias: ["2026-11-27", "2026-11-28"],
      duracionMinutos: 90,
      franjasPorDia: {
        "2026-11-27": { inicio: "18:00", fin: "00:00" },
        "2026-11-28": { inicio: "10:00", fin: "00:00" },
      },
    });

    const partidos: PartidoProgramable[] = [
      {
        id: "z1",
        ronda: "ZONA A",
        orden: 1,
        equipo_a_id: "a",
        equipo_b_id: "d",
        estado_partido: "Programado",
      },
      {
        id: "z2",
        ronda: "ZONA A",
        orden: 2,
        equipo_a_id: "b",
        equipo_b_id: "c",
        estado_partido: "Programado",
      },
      {
        id: "z3",
        ronda: "ZONA A",
        orden: 3,
        estado_partido: "Pendiente Ganadores",
      },
      {
        id: "z4",
        ronda: "ZONA A",
        orden: 4,
        estado_partido: "Pendiente Perdedores",
      },
      {
        id: "oct",
        ronda: "OCTAVOS",
        orden: 17,
        estado_partido: "Programado",
      },
    ];

    asignarHorariosAPartidos(partidos, slots, new Set(), {
      duracionMinutos: 90,
      descansoModo: "tras_fin_120",
      permitirSinEquipos: true,
    });

    const t1 = parseFechaPartidoIsoPublic(String(partidos[0].fecha_partido));
    const t2 = parseFechaPartidoIsoPublic(String(partidos[1].fecha_partido));
    const t3 = parseFechaPartidoIsoPublic(String(partidos[2].fecha_partido));
    const t4 = parseFechaPartidoIsoPublic(String(partidos[3].fecha_partido));
    const to = parseFechaPartidoIsoPublic(String(partidos[4].fecha_partido));

    assert.ok(t1 && t2 && t3 && t4 && to);
    assert.equal(t1.fecha, "2026-11-27");
    assert.equal(t1.startMin, 18 * 60);
    assert.equal(t2.startMin, 18 * 60);
    // Ola 2 después de la ola 1
    assert.ok(
      t3.fecha > t1.fecha ||
        (t3.fecha === t1.fecha && t3.startMin > t1.startMin),
    );
    assert.ok(
      t4.fecha > t1.fecha ||
        (t4.fecha === t1.fecha && t4.startMin > t1.startMin),
    );
    // Llave después de terminar las zonas
    const finZonas = Math.max(
      t3.startMin + (t3.fecha === t4.fecha ? 0 : 0),
      t4.startMin,
    );
    if (to.fecha === t3.fecha && to.fecha === t4.fecha) {
      assert.ok(to.startMin >= finZonas + 90);
    } else {
      assert.ok(to.fecha >= t3.fecha);
    }
  });
});


