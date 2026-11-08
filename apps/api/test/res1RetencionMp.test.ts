import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  RESERVA_MP_RETENCION_MINUTOS,
  RESERVA_PENDIENTE_RETENCION_MINUTOS,
} from "../src/constants/reserva.ts";
import {
  reservaOcupaTurno,
  reservaPendienteExpirada,
} from "../src/utils/reservaRetencion.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

/** Réplica de la grilla: un turno está ocupado si alguna reserva lo bloquea. */
function turnoDisponible(
  turnoId: string,
  reservas: Array<{
    turno_id: string;
    estado_reserva: string;
    created_at?: string;
    retiene_hasta?: string | null;
  }>,
  ahora: Date,
): boolean {
  const bloquea = reservas.some(
    (r) =>
      r.turno_id === turnoId &&
      reservaOcupaTurno(
        {
          estado_reserva: r.estado_reserva,
          created_at: r.created_at,
          retiene_hasta: r.retiene_hasta,
        },
        ahora,
      ),
  );
  return !bloquea;
}

describe("RES-1 retención de turno con Mercado Pago pendiente", () => {
  const ahora = new Date("2026-11-07T18:00:00.000Z");
  const turno = "11111111-1111-1111-1111-111111111111";

  it("el turno queda bloqueado mientras hay pendiente con retiene_hasta vigente (flujo MP)", () => {
    const reservas = [
      {
        turno_id: turno,
        estado_reserva: "pendiente",
        created_at: "2026-11-07T17:50:00.000Z",
        retiene_hasta: "2026-11-07T18:45:00.000Z",
      },
    ];
    assert.equal(turnoDisponible(turno, reservas, ahora), false);
  });

  it("otro jugador no puede tomar el turno: vigente bloquea aunque no esté confirmada", () => {
    assert.equal(
      reservaOcupaTurno(
        {
          estado_reserva: "pendiente",
          retiene_hasta: "2026-11-07T18:30:00.000Z",
        },
        ahora,
      ),
      true,
    );
  });

  it("tras vencer retiene_hasta el pendiente expira y libera el turno", () => {
    const expirada = {
      turno_id: turno,
      estado_reserva: "pendiente",
      retiene_hasta: "2026-11-07T17:55:00.000Z",
    };
    assert.equal(reservaPendienteExpirada(expirada, ahora), true);
    assert.equal(turnoDisponible(turno, [expirada], ahora), true);
  });

  it("transferencia en revisión retiene con ventana larga (14 días)", () => {
    const hasta = new Date("2026-11-21T18:00:00.000Z").toISOString();
    assert.equal(
      reservaOcupaTurno(
        { estado_reserva: "pendiente", retiene_hasta: hasta },
        ahora,
      ),
      true,
    );
  });

  it("contrato del servicio: no borra todas las pendientes y usa retiene_hasta", () => {
    const svc = fuente("apps/api/src/services/reserva.service.ts");

    assert.match(svc, /reservaOcupaTurno/);
    assert.match(svc, /liberarPendientesExpiradas/);
    assert.match(svc, /retiene_hasta:\s*retieneHasta/);
    assert.match(svc, /retencionMercadoPagoDesde/);
    assert.match(svc, /retencionTransferenciaDesde/);
    assert.doesNotMatch(
      svc,
      /Si sólo existen pendientes, las eliminamos/,
    );
    assert.match(svc, /delUsuario/);
    assert.doesNotMatch(
      svc,
      /\.in\("estado_reserva",\s*\["confirmada"\]\)/,
    );
  });

  it("migración y TTL documentados", () => {
    const mig = fuente(
      "supabase/migrations/20261107120000_reservas_retiene_hasta.sql",
    );
    assert.match(mig, /retiene_hasta/);
    assert.equal(RESERVA_PENDIENTE_RETENCION_MINUTOS, 20);
    assert.equal(RESERVA_MP_RETENCION_MINUTOS, 45);
  });
});
