import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estadoEfectivoLicencia,
  fechaVencimientoPasada,
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
