import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LICENCIA_CONFIG_DEFAULT,
  calcularFechaVencimientoLicencia,
} from "../src/utils/licenciaConfig";
import { fechaLatina } from "../src/utils/fechaArgentina";

describe("vencimiento de la licencia", () => {
  it("usa el 31/12 configurado y no un aniversario de la emisión", () => {
    const vence = calcularFechaVencimientoLicencia(
      {
        ...LICENCIA_CONFIG_DEFAULT,
        vigenciaModo: "fecha_fija",
        vencimientoMes: 12,
        vencimientoDia: 31,
        frecuenciaPago: "anual",
      },
      new Date("2026-09-08T19:25:56Z"),
    );
    assert.equal(vence, "2026-12-31");
    assert.equal(fechaLatina(vence), "31/12/2026");
  });
});
