import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  resolverDropEnSlot,
  type DropEnSlotDecision,
} from "../utils/programadorDrop.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function partido(
  partial: Partial<import("../utils/services/torneos.ts").BoardPartido> &
    Pick<
      import("../utils/services/torneos.ts").BoardPartido,
      "id" | "torneo_id"
    >,
): import("../utils/services/torneos.ts").BoardPartido {
  return {
    assigned: false,
    label: partial.id,
    label_a: "A",
    label_b: "B",
    ronda: "ZONA",
    estado_partido: "Programado",
    ...partial,
  } as import("../utils/services/torneos.ts").BoardPartido;
}

describe("CLI-7 drop sobre celda de otra categoría", () => {
  it("bloquea pendiente sobre ocupante de otra categoría", () => {
    const decision = resolverDropEnSlot(
      partido({ id: "nuevo", torneo_id: "t2", assigned: false }),
      partido({
        id: "ocupante",
        torneo_id: "t1",
        assigned: true,
        fecha_partido: "2026-11-28T13:00:00.000Z",
        cancha_asignada: "Cancha 1",
      }),
      { esEvento: true },
    );
    assert.equal(decision.action, "bloquear");
  });

  it("pide confirmación de intercambio si el arrastrado ya tiene horario", () => {
    const decision = resolverDropEnSlot(
      partido({
        id: "movido",
        torneo_id: "t2",
        assigned: true,
        fecha_partido: "2026-11-28T15:00:00.000Z",
        cancha_asignada: "Cancha 2",
      }),
      partido({
        id: "ocupante",
        torneo_id: "t1",
        assigned: true,
        fecha_partido: "2026-11-28T13:00:00.000Z",
        cancha_asignada: "Cancha 1",
      }),
      { esEvento: true },
    );
    assert.equal(decision.action, "confirmar_intercambio_categoria");
    if (decision.action === "confirmar_intercambio_categoria") {
      assert.equal(decision.origen.cancha_label, "Cancha 2");
    }
  });

  it("intercambia atómicamente dentro de la misma categoría", () => {
    const decision: DropEnSlotDecision = resolverDropEnSlot(
      partido({
        id: "a",
        torneo_id: "t1",
        assigned: true,
        fecha_partido: "2026-11-28T15:00:00.000Z",
        cancha_asignada: "Cancha 2",
      }),
      partido({
        id: "b",
        torneo_id: "t1",
        assigned: true,
        fecha_partido: "2026-11-28T13:00:00.000Z",
        cancha_asignada: "Cancha 1",
      }),
      { esEvento: true },
    );
    assert.equal(decision.action, "intercambiar");
  });

  it("no desasigna en silencio al ocupante en handleDragEnd", () => {
    const page = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ProgramadorVisualPage.tsx"),
      "utf8",
    );
    assert.equal(page.includes("desasignar(occupant.id, undefined, { silent: true })"), false);
    assert.match(page, /resolverDropEnSlot/);
    assert.match(page, /intercambiarHorarios/);
  });

  it("muestra ocupación ajena atenuada en la grilla", () => {
    const grid = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ScheduleGrid.tsx"),
      "utf8",
    );
    assert.match(grid, /OcupacionAjenaCard/);
    assert.match(grid, /ocupacionAjena/);
  });
});