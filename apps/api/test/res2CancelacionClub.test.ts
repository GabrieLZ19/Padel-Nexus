import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mensajeNotificacionReservaCanceladaClub } from "../src/utils/reservaCancelacion.ts";

describe("RES-2 notificación cancelación por club", () => {
  it("incluye el motivo cuando el club lo indica", () => {
    const { titulo, mensaje } = mensajeNotificacionReservaCanceladaClub({
      clubNombre: "QA Club",
      canchaNombre: "Cancha 1",
      fechaReserva: "2026-11-08",
      horaInicio: "09:30",
      motivo: "Lluvia",
    });
    assert.equal(titulo, "Reserva cancelada por el club");
    assert.match(mensaje, /QA Club/);
    assert.match(mensaje, /Motivo: Lluvia/);
  });

  it("mensaje base sin motivo", () => {
    const { mensaje } = mensajeNotificacionReservaCanceladaClub({
      clubNombre: "QA Club",
      canchaNombre: "Cancha 1",
      fechaReserva: "2026-11-08",
      horaInicio: "09:30",
    });
    assert.doesNotMatch(mensaje, /Motivo:/);
    assert.match(mensaje, /Mis reservas/);
  });
});
