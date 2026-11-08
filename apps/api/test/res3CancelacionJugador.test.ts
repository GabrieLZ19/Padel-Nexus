import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_HORAS_ANTELACION_CANCELACION_JUGADOR,
  evaluarCancelacionReservaJugador,
  minutosHastaInicioTurno,
} from "../src/utils/cancelacionReservaJugador.ts";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_WEB = path.resolve(RAIZ_API, "../web");

function fuenteWeb(subpath: string): string {
  return readFileSync(path.join(RAIZ_WEB, subpath), "utf8");
}

describe("RES-3 cancelación por el jugador", () => {
  it("pendiente futura siempre se puede cancelar", () => {
    const evaluacion = evaluarCancelacionReservaJugador({
      estado_reserva: "pendiente",
      fecha_reserva: "2099-06-01",
      hora_inicio: "18:00",
      horas_antelacion_club: 24,
    });
    assert.equal(evaluacion.permitido, true);
  });

  it("confirmada respeta horas de anticipación del club", () => {
    const fecha = "2099-06-01";
    const hora = "18:00";
    const dentro = evaluarCancelacionReservaJugador({
      estado_reserva: "confirmada",
      fecha_reserva: fecha,
      hora_inicio: hora,
      horas_antelacion_club: 24,
      ahora: new Date("2099-05-31T12:00:00-03:00"),
    });
    assert.equal(dentro.permitido, true);

    const fuera = evaluarCancelacionReservaJugador({
      estado_reserva: "confirmada",
      fecha_reserva: fecha,
      hora_inicio: hora,
      horas_antelacion_club: 24,
      ahora: new Date("2099-06-01T17:30:00-03:00"),
    });
    assert.equal(fuera.permitido, false);
    assert.match(fuera.motivo || "", /24 h/);
  });

  it("usa 24 h por defecto si el club no define política", () => {
    assert.equal(DEFAULT_HORAS_ANTELACION_CANCELACION_JUGADOR, 24);
    const evaluacion = evaluarCancelacionReservaJugador({
      estado_reserva: "confirmada",
      fecha_reserva: "2099-12-10",
      hora_inicio: "10:00",
      horas_antelacion_club: null,
      ahora: new Date("2099-12-09T08:00:00-03:00"),
    });
    assert.equal(evaluacion.horas_antelacion, 24);
    assert.equal(evaluacion.permitido, true);
  });

  it("minutos hasta el turno son positivos antes del inicio", () => {
    const minutos = minutosHastaInicioTurno(
      "2099-01-15",
      "20:00",
      new Date("2099-01-15T10:00:00-03:00"),
    );
    assert.equal(minutos, 600);
  });

  it("contrato web: servicio y UI de mis reservas", () => {
    const servicio = fuenteWeb("utils/services/reservas.ts");
    const pagina = fuenteWeb("app/(public)/mi-perfil/reservas/page.tsx");
    assert.match(servicio, /async cancelar\(reservaId: string\)/);
    assert.match(pagina, /ReservasService\.cancelar/);
    assert.match(pagina, /puede_cancelar/);
    assert.match(pagina, /FeedbackModal/);
  });
});
