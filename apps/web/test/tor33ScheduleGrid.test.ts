import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-33 ScheduleGrid quitar de la grilla", () => {
  it("usa asa de arrastre y boton quitar con z-index, sin drag en toda la tarjeta", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ScheduleGrid.tsx"),
      "utf8",
    );
    assert.match(fuente, /GripVertical/);
    assert.match(fuente, /z-30/);
    assert.doesNotMatch(
      fuente,
      /className=\{`prog-booking[\s\S]*?\}\`\s+title=\{[\s\S]*?\}\s+\{\.\.\.listeners\}/,
    );
  });

  it("ProgramadorVisualPage confirma antes de desasignar desde la grilla", () => {
    const fuente = readFileSync(
      path.join(
        RAIZ,
        "components/torneos/programador/ProgramadorVisualPage.tsx",
      ),
      "utf8",
    );
    assert.match(fuente, /quitarPartido/);
    assert.match(fuente, /¿Quitar de la grilla\?/);
    assert.match(fuente, /no hace falta «Guardar borrador»/);
  });
});
