import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-18 drag en toda la tarjeta del programador", () => {
  it("ScheduleGrid: listeners en la tarjeta, no solo en el grip", () => {
    const grid = fs.readFileSync(
      path.join(RAIZ, "components/torneos/programador/ScheduleGrid.tsx"),
      "utf8",
    );
    assert.match(grid, /select-none/);
    assert.match(grid, /readOnly \? listeners/);
    assert.doesNotMatch(
      grid,
      /\{\.\.\.listeners\}[\s\S]{0,80}<GripVertical/,
    );
  });

  it("PendingMatchesSidebar: listeners en el contenedor de la tarjeta", () => {
    const src = fs.readFileSync(
      path.join(RAIZ, "components/torneos/programador/PendingMatchesSidebar.tsx"),
      "utf8",
    );
    assert.match(src, /\{\.\.\.listeners\}/);
    assert.match(src, /select-none/);
  });

  it("ZonaParejasPanel: drag en la fila de pareja completa", () => {
    const src = fs.readFileSync(
      path.join(RAIZ, "components/torneos/programador/ZonaParejasPanel.tsx"),
      "utf8",
    );
    assert.match(src, /listeners/);
    assert.match(src, /select-none/);
    assert.doesNotMatch(src, /<button[\s\S]{0,200}listeners/);
  });
});