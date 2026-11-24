import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { generarDiasJuegoDefault } from "../utils/diasJuegoTorneo";
import { evaluarCapacidadDiasCompetencia } from "../utils/capacidadDiasCompetencia";

describe("TOR-51 frontend — días y aviso de capacidad", () => {
  it("generarDiasJuegoDefault coincide con el backend en fin de semana", () => {
    const dias = generarDiasJuegoDefault(
      "2026-11-28T12:00:00-03:00",
      "2026-11-30T12:00:00-03:00",
    );
    assert.deepEqual(dias, ["Sáb 28", "Dom 29", "Lun 30"]);
  });

  it("Paso3 muestra alerta de capacidad", () => {
    const paso3 = fs.readFileSync(
      path.resolve(import.meta.dirname, "../components/torneos/wizard/Paso3Categorias.tsx"),
      "utf-8",
    );
    assert.match(paso3, /evaluarCapacidadDiasCompetencia/);
    assert.match(paso3, /role="alert"/);
  });

  it("Paso8 incluye aviso al generar cuadro", () => {
    const paso8 = fs.readFileSync(
      path.resolve(import.meta.dirname, "../components/torneos/wizard/Paso8Cuadros.tsx"),
      "utf-8",
    );
    assert.match(paso8, /evaluarCapacidadDiasCompetencia/);
  });

  it("detecta un solo día insuficiente para 16 parejas", () => {
    const ev = evaluarCapacidadDiasCompetencia({
      parejas: 16,
      duracionMinutos: 90,
      diasSeleccionados: 1,
      canchasDisponibles: 2,
    });
    assert.equal(ev.ok, false);
  });
});