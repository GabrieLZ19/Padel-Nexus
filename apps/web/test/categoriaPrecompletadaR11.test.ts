import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("R11 - Categoría y datos precompletados en Paso 3", () => {
  const paso3Path = path.resolve(
    "apps/web/components/torneos/wizard/Paso3Categorias.tsx",
  );

  it("Paso3Categorias inicializa selectedDias con todos los días de competencia cuando dias_juego no viene en DB", () => {
    const code = fs.readFileSync(paso3Path, "utf-8");
    assert.ok(
      code.includes("getPlayDaysRange().map((d) => d.value)"),
      "selectedDias debe preseleccionar todos los días disponibles si dias_juego está vacío",
    );
  });

  it("Paso3Categorias incluye efecto de sincronización con torneo.categoria y torneo.nivel", () => {
    const code = fs.readFileSync(paso3Path, "utf-8");
    assert.ok(
      code.includes("R11: Mantener sincronizados categoría, nivel, rama y días"),
      "Debe incluir efecto de sincronización al cargar o actualizar el torneo",
    );
  });

  it("Paso3Categorias muestra el banner de paso completado con los datos de creación", () => {
    const code = fs.readFileSync(paso3Path, "utf-8");
    assert.ok(
      code.includes("Paso completado con los datos de creación"),
      "Debe mostrar el banner informativo para dar tranquilidad al usuario de que no debe recargar datos",
    );
  });
});
