import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  motivoPublicacionBloqueada,
  puedePublicarProgramacion,
} from "../utils/programadorPublicar.ts";
import type { ProgramacionBoard } from "../utils/services/torneos.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function boardBase(
  partial: Partial<ProgramacionBoard>,
): ProgramacionBoard {
  return {
    torneo_id: "t1",
    nombre: "Torneo",
    estado: "Programado",
    programacion_estado: "borrador",
    programacion_publicada_en: null,
    duracion_partido_minutos: 90,
    descanso_minutos: 60,
    descanso_modo: "tras_fin_60",
    sugerencia: { canchas: 1, horas: 8, mensaje: "" },
    dias: ["2026-11-10"],
    canchas: [],
    slots: [],
    partidos: [],
    issues: [],
    summary: { total: 4, asignados: 4, pendientes: 0, advertencias: 0 },
    ...partial,
  };
}

describe("TOR-4 publicar bloqueado con explicación", () => {
  it("bloquea si hay partidos pendientes y devuelve mensaje accionable", () => {
    const board = boardBase({
      summary: { total: 6, asignados: 4, pendientes: 2, advertencias: 0 },
    });
    assert.equal(puedePublicarProgramacion(board), false);
    const motivo = motivoPublicacionBloqueada(board);
    assert.ok(motivo);
    assert.match(motivo!, /Faltan 2 partidos/);
    assert.match(motivo!, /Asignar automáticamente/);
  });

  it("bloquea sin canchas/días con mensaje explícito", () => {
    const board = boardBase({ dias: [] });
    assert.match(motivoPublicacionBloqueada(board)!, /Agregá al menos un club/);
  });

  it("permite publicar cuando no hay pendientes", () => {
    const board = boardBase({});
    assert.equal(puedePublicarProgramacion(board), true);
    assert.equal(motivoPublicacionBloqueada(board), null);
  });

  it("la top bar muestra el motivo de bloqueo en pantalla", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ProgramadorTopBar.tsx"),
      "utf8",
    );
    assert.match(fuente, /motivoPublicacionBloqueada/);
    assert.match(fuente, /role="status"/);
  });

  it("al intentar publicar con pendientes avisa antes del modal", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ProgramadorVisualPage.tsx"),
      "utf8",
    );
    assert.match(fuente, /motivoPublicacionBloqueada/);
  });
});
