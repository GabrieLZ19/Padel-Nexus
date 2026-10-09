import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  armarFilasAgenda,
  esReservaAtrasada,
} from "../src/utils/agendaReservas.ts";

describe("agenda de reservas del club", () => {
  it("arma una fila por horario y una celda por cancha", () => {
    const filas = armarFilasAgenda(
      ["c1", "c2"],
      [
        { id: "t1", cancha_id: "c1", hora_inicio: "18:00:00", hora_fin: "19:30:00" },
        { id: "t2", cancha_id: "c2", hora_inicio: "18:00:00", hora_fin: "19:30:00" },
        { id: "t3", cancha_id: "c1", hora_inicio: "10:00:00", hora_fin: "11:30:00" },
      ],
      [
        {
          id: "r1",
          turno_id: "t2",
          estado_reserva: "pendiente",
          estado_pago: "pendiente",
          jugador: "Pérez, Ana",
          precio: 10000,
        },
      ],
    );

    assert.equal(filas.length, 2);
    assert.equal(filas[0]?.hora_inicio, "10:00");
    assert.equal(filas[0]?.celdas[0]?.reserva, null);
    assert.equal(filas[0]?.celdas[1]?.turno_id, null);
    assert.equal(filas[1]?.hora_inicio, "18:00");
    assert.equal(filas[1]?.celdas[1]?.reserva?.jugador, "Pérez, Ana");
  });

  it("marca como atrasada una pendiente de un día anterior", () => {
    assert.equal(esReservaAtrasada("2026-09-02", "pendiente", "2026-10-09"), true);
    assert.equal(esReservaAtrasada("2026-10-09", "pendiente", "2026-10-09"), false);
    assert.equal(esReservaAtrasada("2026-09-02", "confirmada", "2026-10-09"), false);
  });
});
