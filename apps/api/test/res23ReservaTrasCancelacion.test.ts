import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-23 reserva tras cancelación", () => {
  it("migración usa índice único parcial excluyendo canceladas", () => {
    const sql = readFileSync(
      path.join(
        RAIZ,
        "../../supabase/migrations/20261126210000_res23_reservas_unique_turno_fecha_parcial.sql",
      ),
      "utf8",
    );
    assert.match(
      sql,
      /ALTER TABLE public\.reservas DROP CONSTRAINT IF EXISTS unique_turno_fecha/,
    );
    assert.match(
      sql,
      /WHERE \(estado_reserva IS DISTINCT FROM 'cancelada'\)/,
    );
  });

  it("crearReserva traduce violación 23505 a TURNO_OCUPADO", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async crearReserva"),
      svc.indexOf("static async obtenerTurnoConDetalles"),
    );
    assert.match(bloque, /error\.code === "23505"/);
    assert.match(bloque, /throw new Error\("TURNO_OCUPADO"\)/);
  });

  it("POST crear reserva responde 409 con mensaje amigable para TURNO_OCUPADO", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/reserva.controller.ts"),
      "utf8",
    );
    const bloque = ctrl.slice(
      ctrl.indexOf("async crearReserva"),
      ctrl.indexOf("async getReservaPorId"),
    );
    assert.match(bloque, /message === "TURNO_OCUPADO"/);
    assert.match(bloque, /status\(409\)/);
    assert.match(bloque, /La cancha ya está reservada en ese horario/);
  });

  it("disponibilidad ignora reservas canceladas al marcar ocupación", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async obtenerDisponibilidad"),
      svc.indexOf("static async crearReserva"),
    );
    assert.match(bloque, /\.neq\("estado_reserva", "cancelada"\)/);
  });
});