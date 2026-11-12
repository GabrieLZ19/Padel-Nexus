import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estadoEfectivoLicencia,
  fechaVencimientoPasada,
  normalizarPerfilLicencias,
  reconciliarEstadoAlmacenadoConVencimiento,
} from "../src/utils/estadoLicencia.ts";
import { resumirLicenciasPorJugador } from "../src/utils/resumenLicencias.ts";

describe("ENT-2: vencimiento efectivo de licencias", () => {
  it("Activa con fecha pasada se considera Vencida", () => {
    assert.equal(
      estadoEfectivoLicencia("Activa", "2026-10-31", new Date("2026-11-06T15:00:00Z")),
      "Vencida",
    );
    assert.equal(
      fechaVencimientoPasada("2026-10-31", new Date("2026-11-06T15:00:00Z")),
      true,
    );
  });

  it("Activa con vencimiento hoy sigue vigente", () => {
    assert.equal(
      estadoEfectivoLicencia("Activa", "2026-11-06", new Date("2026-11-06T15:00:00Z")),
      "Activa",
    );
  });

  it("ENT-16: Vencida almacenada con fecha futura se considera vigente", () => {
    const ref = new Date("2026-11-06T15:00:00Z");
    assert.equal(
      estadoEfectivoLicencia("Vencida", "2027-01-15", ref),
      "Activa",
    );
    assert.equal(
      reconciliarEstadoAlmacenadoConVencimiento("Vencida", "2027-01-15", ref),
      "Activa",
    );
    assert.equal(
      reconciliarEstadoAlmacenadoConVencimiento("Activa", "2026-10-01", ref),
      "Vencida",
    );
    assert.equal(
      reconciliarEstadoAlmacenadoConVencimiento("Suspendida", "2027-01-15", ref),
      "Suspendida",
    );
  });

  it("normalizarPerfilLicencias siempre devuelve licencias como array", () => {
    const una = {
      id: "u1",
      licencias: {
        id: "l1",
        estado: "Activa",
        fecha_vencimiento: "2026-12-31",
      },
    };
    const normUna = normalizarPerfilLicencias(una);
    assert.ok(Array.isArray(normUna.licencias));
    assert.equal((normUna.licencias as { id: string }[])[0]?.id, "l1");

    const varias = {
      id: "u2",
      licencias: [
        { id: "l2", estado: "Activa", fecha_vencimiento: "2026-12-31" },
        { id: "l3", estado: "Vencida", fecha_vencimiento: "2025-01-01" },
      ],
    };
    const normVarias = normalizarPerfilLicencias(varias);
    assert.ok(Array.isArray(normVarias.licencias));
    assert.equal((normVarias.licencias as unknown[]).length, 2);
  });

  it("el resumen cuenta Activa vencida como vencida", () => {
    const resumen = resumirLicenciasPorJugador([
      {
        licencias: [
          { estado: "Activa", fecha_vencimiento: "2026-10-31" },
        ],
      },
    ]);
    assert.equal(resumen.vencidas, 1);
    assert.equal(resumen.vigentes, 0);
  });
});
