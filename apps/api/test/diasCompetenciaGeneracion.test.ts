import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("validación de días de competencia antes de generar cuadros", () => {
  it("valida que dias_juego no sea null ni vacío", () => {
    const validarDias = (diasJuegoRaw: unknown) => {
      const diasValidos = Array.isArray(diasJuegoRaw)
        ? diasJuegoRaw.filter((d: any) => typeof d === "string" && d.trim().length > 0)
        : [];
      if (diasValidos.length === 0) {
        throw new Error(
          "El torneo no tiene días de competencia definidos. Configurá los días de juego en el Paso 3 (Categorías) antes de generar los cuadros.",
        );
      }
      return true;
    };

    assert.throws(() => validarDias(null), /días de competencia definidos/);
    assert.throws(() => validarDias([]), /días de competencia definidos/);
    assert.throws(() => validarDias([""]), /días de competencia definidos/);
    assert.doesNotThrow(() => validarDias(["Sáb 28", "Dom 29"]));
  });
});
