import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asignarHorariosAPartidos,
  slotKey,
  type PartidoProgramable,
  type SlotProgramacion,
} from "../src/utils/programacionPartidos";

describe("R9 - Asignación de varios partidos a la vez a la grilla", () => {
  it("asigna múltiples partidos seleccionados (Zona A, Zona B, Zona C) a los siguientes slots libres", () => {
    // 3 canchas disponibles a las 09:00 y a las 12:00
    const slots: SlotProgramacion[] = [
      {
        canchaLabel: "Cancha 1",
        fecha: "2026-10-24",
        hora: "09:00",
        fechaIso: "2026-10-24T09:00:00-03:00",
      },
      {
        canchaLabel: "Cancha 2",
        fecha: "2026-10-24",
        hora: "09:00",
        fechaIso: "2026-10-24T09:00:00-03:00",
      },
      {
        canchaLabel: "Cancha 3",
        fecha: "2026-10-24",
        hora: "09:00",
        fechaIso: "2026-10-24T09:00:00-03:00",
      },
      {
        canchaLabel: "Cancha 1",
        fecha: "2026-10-24",
        hora: "12:00",
        fechaIso: "2026-10-24T12:00:00-03:00",
      },
    ];

    // Partidos seleccionados en lote: Zona A p1, Zona B p1, Zona C p1, Zona A p2 (eq1)
    const partidosSeleccionados: PartidoProgramable[] = [
      {
        id: "p_za_1",
        ronda: "ZONA A",
        orden: 1,
        equipo_a_id: "eq1",
        equipo_b_id: "eq2",
        estado_partido: "Programado",
      },
      {
        id: "p_zb_1",
        ronda: "ZONA B",
        orden: 1,
        equipo_a_id: "eq3",
        equipo_b_id: "eq4",
        estado_partido: "Programado",
      },
      {
        id: "p_zc_1",
        ronda: "ZONA C",
        orden: 1,
        equipo_a_id: "eq5",
        equipo_b_id: "eq6",
        estado_partido: "Programado",
      },
      {
        id: "p_za_2",
        ronda: "ZONA A",
        orden: 2,
        equipo_a_id: "eq1",
        equipo_b_id: "eq7",
        estado_partido: "Programado",
      },
    ];

    const ocupados = new Set<string>();

    asignarHorariosAPartidos(partidosSeleccionados, slots, ocupados, {
      duracionMinutos: 90,
      descansoMinutos: 60,
      distribucion: "continua",
    });

    // Los primeros 3 partidos de zonas distintas deben ocupar las 3 canchas a las 09:00
    assert.equal(partidosSeleccionados[0].cancha_asignada, "Cancha 1");
    assert.equal(
      partidosSeleccionados[0].fecha_partido,
      "2026-10-24T09:00:00-03:00",
    );

    assert.equal(partidosSeleccionados[1].cancha_asignada, "Cancha 2");
    assert.equal(
      partidosSeleccionados[1].fecha_partido,
      "2026-10-24T09:00:00-03:00",
    );

    assert.equal(partidosSeleccionados[2].cancha_asignada, "Cancha 3");
    assert.equal(
      partidosSeleccionados[2].fecha_partido,
      "2026-10-24T09:00:00-03:00",
    );

    // El 4to partido (Zona A p2 con eq1) respeta descanso de eq1 (9:00+90m+60m descanso = 11:30) y se agenda a las 12:00
    assert.equal(partidosSeleccionados[3].cancha_asignada, "Cancha 1");
    assert.equal(
      partidosSeleccionados[3].fecha_partido,
      "2026-10-24T12:00:00-03:00",
    );
  });

  it("respeta slots ya ocupados previamente en la grilla y no los sobreescribe", () => {
    const slots: SlotProgramacion[] = [
      {
        canchaLabel: "Cancha 1",
        fecha: "2026-10-24",
        hora: "09:00",
        fechaIso: "2026-10-24T09:00:00-03:00",
      },
      {
        canchaLabel: "Cancha 2",
        fecha: "2026-10-24",
        hora: "09:00",
        fechaIso: "2026-10-24T09:00:00-03:00",
      },
    ];

    // Cancha 1 09:00 ya está ocupada
    const ocupados = new Set([slotKey("Cancha 1", "2026-10-24", "09:00")]);

    const partidos: PartidoProgramable[] = [
      {
        id: "p_nuevo",
        ronda: "ZONA A",
        orden: 1,
        equipo_a_id: "eq1",
        equipo_b_id: "eq2",
        estado_partido: "Programado",
      },
    ];

    asignarHorariosAPartidos(partidos, slots, ocupados, {
      duracionMinutos: 90,
      descansoMinutos: 60,
      distribucion: "continua",
    });

    // Se asigna al slot libre (Cancha 2) y no al ocupado
    assert.equal(partidos[0].cancha_asignada, "Cancha 2");
    assert.equal(partidos[0].fecha_partido, "2026-10-24T09:00:00-03:00");
  });
});
