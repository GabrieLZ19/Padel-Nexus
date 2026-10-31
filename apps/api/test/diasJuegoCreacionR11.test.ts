import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TorneoService } from "../src/services/torneo.service.ts";

describe("R11 - Precompletar días de juego y datos al crear el torneo (Backend)", () => {
  it("genera los días de juego automáticamente para un torneo de fin de semana (Viernes a Domingo)", () => {
    const dias = TorneoService.generarDiasJuegoDefault(
      "2026-11-06T09:00:00",
      "2026-11-08T22:00:00",
    );

    assert.equal(dias.length, 3);
    assert.deepEqual(dias, ["Vie 6", "Sáb 7", "Dom 8"]);
  });

  it("genera un solo día de juego si el torneo es de una sola jornada", () => {
    const dias = TorneoService.generarDiasJuegoDefault(
      "2026-11-07T09:00:00",
      "2026-11-07T21:00:00",
    );

    assert.equal(dias.length, 1);
    assert.equal(dias[0], "Sáb 7");
  });

  it("retorna fallback estándar si no se especifican fechas", () => {
    const dias = TorneoService.generarDiasJuegoDefault(null, null);

    assert.deepEqual(dias, ["Viernes", "Sábado", "Domingo"]);
  });
});
