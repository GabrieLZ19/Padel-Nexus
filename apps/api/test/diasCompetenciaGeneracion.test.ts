import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generarDiasJuegoDefault } from "../src/utils/diasJuegoTorneo.ts";

describe("validación de días de competencia antes de generar cuadros", () => {
  it("valida que dias_juego no sea null ni vacío", () => {
    const validarDias = (diasJuegoRaw: unknown) => {
      const diasValidos = Array.isArray(diasJuegoRaw)
        ? diasJuegoRaw.filter(
            (d: string) => typeof d === "string" && d.trim().length > 0,
          )
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

describe("generarDiasJuegoDefault al editar fecha_fin", () => {
  it("amplía el rango de viernes a domingo en un fin de semana", () => {
    const dias = generarDiasJuegoDefault(
      "2026-11-06T09:00:00",
      "2026-11-08T22:00:00",
    );
    assert.deepEqual(dias, ["Vie 6", "Sáb 7", "Dom 8"]);
  });
});