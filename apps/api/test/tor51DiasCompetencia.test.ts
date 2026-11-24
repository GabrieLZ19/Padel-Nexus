import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  fechasTorneoCambiaron,
  generarDiasJuegoDefault,
  resolverDiasJuegoTrasCambioFechas,
} from "../src/utils/diasJuegoTorneo.ts";
import {
  evaluarCapacidadDiasCompetencia,
  estimarPartidosZonasYLlave,
} from "../src/utils/capacidadDiasCompetencia.ts";

describe("TOR-51 días de competencia", () => {
  it("genera Vie–Dom para torneo del 28 al 30 de noviembre 2026", () => {
    const dias = generarDiasJuegoDefault(
      "2026-11-28T12:00:00-03:00",
      "2026-11-30T12:00:00-03:00",
    );
    assert.deepEqual(dias, ["Sáb 28", "Dom 29", "Lun 30"]);
  });

  it("sincroniza dias_juego al extender fecha_fin sin dias explícitos", () => {
    const actual = {
      fecha: "2026-11-28T12:00:00-03:00",
      fecha_fin: "2026-11-28T12:00:00-03:00",
    };
    const update = {
      fecha_fin: "2026-11-30T12:00:00-03:00",
    };
    assert.equal(fechasTorneoCambiaron(actual, update), true);
    const dias = resolverDiasJuegoTrasCambioFechas(actual, update, undefined);
    assert.deepEqual(dias, ["Sáb 28", "Dom 29", "Lun 30"]);
  });

  it("no pisa dias_juego si el cliente envía dias explícitos", () => {
    const dias = resolverDiasJuegoTrasCambioFechas(
      { fecha: "2026-11-28", fecha_fin: "2026-11-28" },
      { fecha_fin: "2026-11-30" },
      ["Sáb 28"],
    );
    assert.equal(dias, undefined);
  });

  it("actualizarTorneo invoca resolverDiasJuegoTrasCambioFechas", () => {
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, "../src/services/torneo.service.ts"),
      "utf-8",
    );
    assert.match(src, /resolverDiasJuegoTrasCambioFechas/);
  });
});

describe("TOR-51/TOR-4 aviso de capacidad en días", () => {
  it("estima más de 25 partidos para 16 parejas FAP", () => {
    const n = estimarPartidosZonasYLlave(16, "FAP");
    assert.ok(n >= 24);
  });

  it("marca capacidad insuficiente con un solo día y pocas canchas", () => {
    const evaluacion = evaluarCapacidadDiasCompetencia({
      parejas: 16,
      reglamento: "FAP",
      duracionMinutos: 90,
      diasSeleccionados: 1,
      canchasDisponibles: 2,
    });
    assert.equal(evaluacion.ok, false);
    assert.ok(evaluacion.mensaje && /día|jornada|cancha/i.test(evaluacion.mensaje));
  });

  it("acepta tres días de competencia para 16 parejas y 2 canchas", () => {
    const evaluacion = evaluarCapacidadDiasCompetencia({
      parejas: 16,
      reglamento: "FAP",
      duracionMinutos: 90,
      diasSeleccionados: 3,
      canchasDisponibles: 2,
    });
    assert.equal(evaluacion.ok, true);
  });
});