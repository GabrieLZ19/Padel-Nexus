import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aplicarHorarioConservado,
  horariosPorCruce,
} from "../src/utils/horariosZona";

describe("horarios al mover parejas de zona", () => {
  it("conserva cancha y horario si las dos parejas siguen jugando", () => {
    const horarios = horariosPorCruce([
      {
        equipoAId: "a",
        equipoBId: "b",
        cancha: "Cancha 1",
        fecha: "2026-10-10T09:00:00",
      },
      {
        equipoAId: "c",
        equipoBId: "d",
        cancha: "Cancha 2",
        fecha: "2026-10-10T10:00:00",
      },
    ]);

    const mismo = aplicarHorarioConservado(
      { equipo_a_id: "b", equipo_b_id: "a", orden: 1 },
      horarios,
    );
    assert.equal(mismo.cancha_asignada, "Cancha 1");
    assert.equal(mismo.fecha_partido, "2026-10-10T09:00:00");

    const nuevo = aplicarHorarioConservado(
      { equipo_a_id: "a", equipo_b_id: "c", orden: 2 },
      horarios,
    );
    assert.equal(nuevo.cancha_asignada, undefined);
    assert.equal(nuevo.fecha_partido, undefined);
  });
});
