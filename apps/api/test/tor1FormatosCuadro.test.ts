import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  FORMATOS_TORNEO_CUADRO_FASE1,
  formatoTorneoSoportaGeneracionCuadro,
} from "../src/constants/torneoFormato.ts";
import {
  FORMATOS_TORNEO_CLUB_SELECCION,
  FORMATOS_TORNEO_OFICIAL_SELECCION,
} from "../../web/utils/constants/fapApaRules";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("TOR-1 formatos Round Robin / Super 8 sin motor propio", () => {
  it("solo Zonas + Llaves y Eliminatoria Directa generan cuadro", () => {
    assert.deepEqual([...FORMATOS_TORNEO_CUADRO_FASE1], [
      "Zonas + Llaves",
      "Eliminatoria Directa",
    ]);
    assert.equal(formatoTorneoSoportaGeneracionCuadro("Zonas + Llaves"), true);
    assert.equal(formatoTorneoSoportaGeneracionCuadro("Eliminatoria Directa"), true);
    assert.equal(formatoTorneoSoportaGeneracionCuadro("Super 8"), false);
    assert.equal(formatoTorneoSoportaGeneracionCuadro("Todos contra Todos"), false);
    assert.equal(formatoTorneoSoportaGeneracionCuadro("Americano"), false);
  });

  it("el selector del asistente no ofrece formatos sin motor", () => {
    const valoresClub = FORMATOS_TORNEO_CLUB_SELECCION.map((f) => f.value);
    assert.deepEqual(valoresClub, [
      "Zonas + Llaves",
      "Eliminatoria Directa",
    ]);
    assert.equal(
      FORMATOS_TORNEO_OFICIAL_SELECCION.some((f) => f.value === "Todos contra Todos"),
      false,
    );
  });

  it("generarCuadroEliminatoria valida el formato antes de armar zonas", () => {
    const svc = fuente("apps/api/src/services/torneo.service.ts");
    assert.match(svc, /formatoTorneoSoportaGeneracionCuadro/);
    assert.match(svc, /aún no tiene generación de cuadros/);
  });
});
