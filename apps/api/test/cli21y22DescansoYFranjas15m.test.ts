import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asignarHorariosAPartidos,
  buildOcupadosDesdePartidos,
  duracionParaFase,
  duracionTurnoEnFecha,
  generarSlotsDesdeSedesYVentana,
  parejaPuedeJugarEnSlot,
  type DisponibilidadTorneo,
  type PartidoProgramable,
} from "../src/utils/programacionPartidos.ts";
import {
  evaluarDescansoInsuficiente,
  horaEnGrillaProgramador,
  minutosDesdeHora,
  minutosDeModoDescanso,
} from "../src/utils/programadorReglas.ts";

const canchaBase: DisponibilidadTorneo = {
  club_id: "club-1",
  cancha_id: "cancha-1",
  fecha: "2026-11-28",
  hora_inicio: "08:00:00",
  clubes: { nombre: "Club Alta Barda" },
  canchas: { nombre: "1" },
};

describe("CLI-21 y CLI-22 — descanso 0, duración por día y grilla 15 min", () => {
  it("sin_descanso permite partidos seguidos sin hueco tras el fin", () => {
    assert.equal(minutosDeModoDescanso("sin_descanso"), 0);
    const inicio = 9 * 60;
    const duracion = 60;
    assert.equal(
      evaluarDescansoInsuficiente("sin_descanso", inicio, inicio + duracion, duracion),
      false,
    );
    assert.equal(
      evaluarDescansoInsuficiente("sin_descanso", inicio, inicio + 30, duracion),
      true,
    );

    const historial = [
      { fecha: "2026-11-28", startMin: inicio, endMin: inicio + duracion },
    ];
    assert.equal(
      parejaPuedeJugarEnSlot(
        historial,
        "2026-11-28",
        inicio + duracion,
        duracion,
        undefined,
        "sin_descanso",
      ),
      true,
    );
  });

  it("duracionParaFase respeta 60 min en llave cuando el torneo/franja lo define", () => {
    assert.equal(duracionParaFase(60, "zonas"), 60);
    assert.equal(duracionParaFase(60, "llave"), 60);
    assert.equal(duracionParaFase(90, "llave"), 90);
    assert.equal(duracionParaFase(75, "llave"), 75);
  });

  it("franjasPorDia generan slots de 60 min en sábado y 90 en domingo", () => {
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [
        { ...canchaBase, fecha: "2026-11-28" },
        { ...canchaBase, fecha: "2026-11-29" },
      ],
      dias: ["2026-11-28", "2026-11-29"],
      duracionMinutos: 90,
      franjasPorDia: {
        "2026-11-28": { inicio: "08:00", fin: "12:00", duracion: 60 },
        "2026-11-29": { inicio: "08:00", fin: "12:00", duracion: 90 },
      },
    });

    const sab = slots
      .filter((s) => s.fecha === "2026-11-28")
      .map((s) => s.hora.slice(0, 5));
    const dom = slots
      .filter((s) => s.fecha === "2026-11-29")
      .map((s) => s.hora.slice(0, 5));

    assert.deepEqual(sab, ["08:00", "09:00", "10:00", "11:00"]);
    assert.deepEqual(dom, ["08:00", "09:30"]);
  });

  it("auto-asignación usa duración por día al validar parejas en llave", () => {
    const slots = generarSlotsDesdeSedesYVentana({
      canchas: [canchaBase],
      dias: ["2026-11-28"],
      duracionMinutos: 90,
      franjasPorDia: {
        "2026-11-28": { inicio: "08:00", fin: "11:00", duracion: 60 },
      },
    });

    const partidos: PartidoProgramable[] = [
      {
        id: "oct-1",
        ronda: "OCTAVOS",
        orden: 1,
        equipo_a_id: "a",
        equipo_b_id: "b",
      },
    ];

    asignarHorariosAPartidos(partidos, slots, new Set(), {
      duracionMinutos: 90,
      duracionZonaMinutos: 60,
      descansoModo: "sin_descanso",
      duracionPorDia: { "2026-11-28": 60 },
      permitirSinEquipos: true,
    });

    assert.equal(partidos[0].cancha_asignada?.includes("Club"), true);
    assert.match(String(partidos[0].fecha_partido), /T11:00:00/);
  });

  it("duracionTurnoEnFecha prioriza franja del día sobre fallback de llave", () => {
    assert.equal(
      duracionTurnoEnFecha("2026-11-28", 90, { "2026-11-28": 60 }),
      60,
    );
    assert.equal(duracionTurnoEnFecha("2026-11-29", 90, { "2026-11-28": 60 }), 90);
  });

  it("grilla de 15 minutos en inicio de franja", () => {
    assert.equal(horaEnGrillaProgramador("08:00"), true);
    assert.equal(horaEnGrillaProgramador("08:15"), true);
    assert.equal(horaEnGrillaProgramador("08:30"), true);
    assert.equal(horaEnGrillaProgramador("08:07"), false);
    assert.equal(horaEnGrillaProgramador("00:00"), true);

    assert.throws(
      () =>
        generarSlotsDesdeSedesYVentana({
          canchas: [canchaBase],
          dias: ["2026-11-28"],
          duracionMinutos: 60,
          franjasPorDia: {
            "2026-11-28": { inicio: "08:07", fin: "12:00" },
          },
        }),
      /15 minutos/,
    );
  });
});