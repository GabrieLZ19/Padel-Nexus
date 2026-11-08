import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  FORMATOS_TORNEO_CLUB,
  FORMATOS_TORNEO_CLUB_SELECCION,
  FORMATOS_TORNEO_CUADRO_FASE1,
} from "../utils/constants/fapApaRules.ts";

function leerArchivo(subpath: string): string {
  return fs.readFileSync(path.resolve(subpath), "utf8");
}

describe("TOR-1 selector de formato en asistente", () => {
  it("los formatos recreativos siguen catalogados pero no en selección Fase 1", () => {
    assert.ok(FORMATOS_TORNEO_CLUB.some((f) => f.value === "Super 8"));
    assert.equal(FORMATOS_TORNEO_CLUB_SELECCION.length, FORMATOS_TORNEO_CUADRO_FASE1.length);
    assert.equal(
      FORMATOS_TORNEO_CLUB_SELECCION.some((f) => f.value === "Super 8"),
      false,
    );
  });

  it("Paso1Datos usa FORMATOS_TORNEO_*_SELECCION", () => {
    const paso = leerArchivo("components/torneos/wizard/Paso1Datos.tsx");
    assert.match(paso, /FORMATOS_TORNEO_CLUB_SELECCION/);
    assert.match(paso, /FORMATOS_TORNEO_OFICIAL_SELECCION/);
    assert.doesNotMatch(paso, /Todos contra Todos \(Round Robin\)/);
  });
});
