import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-24 / RES-27 cancelación cobrada y reintegro", () => {
  it("gestionarReservaClub exige motivo y marca reembolso_pendiente", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(svc, /motivoRaw\.length < 8/);
    assert.match(svc, /reembolso_pendiente/);
    assert.match(svc, /accion === "reembolsar"/);
    assert.match(svc, /estado_pago: "reembolsado"/);
  });

  it("RES-27: permite reembolsar reserva cancelada con reembolso pendiente", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(
      svc,
      /estado_reserva === "cancelada" && accion !== "reembolsar"/,
    );
  });

  it("RES-24: cancelación por jugador con pago completado pasa a reembolso_pendiente", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/reserva.service.ts"),
      "utf8",
    );
    const bloqueCancelar = svc.match(
      /static async cancelarReserva[\s\S]*?static async|static async cancelarReserva[\s\S]*?private static async/,
    );
    assert.ok(bloqueCancelar, "cancelarReserva definido");
    assert.match(
      bloqueCancelar[0],
      /estado_pago === "completado"[\s\S]*\? "reembolso_pendiente"/,
    );
  });
});