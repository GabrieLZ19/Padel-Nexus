import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, "..");

describe("CLI-17 — intercambio atómico y refresh del board en error", () => {
  it("useProgramadorBoard no usa desasignar+asignar para intercambiar", () => {
    const hook = readFileSync(
      path.join(RAIZ, "components/torneos/programador/useProgramadorBoard.ts"),
      "utf8",
    );
    const bloque = hook.slice(
      hook.indexOf("const intercambiarHorarios"),
      hook.indexOf("const asignarLote"),
    );
    assert.match(bloque, /intercambiarEventoProgramacion/);
    assert.match(bloque, /intercambiarProgramacion/);
    assert.doesNotMatch(
      bloque,
      /desasignarEventoProgramacion[\s\S]*asignarEventoProgramacion/,
    );
    assert.doesNotMatch(
      bloque,
      /desasignarProgramacion[\s\S]*asignarProgramacion/,
    );
  });

  it("en error de intercambio vuelve a pedir el board al servidor", () => {
    const hook = readFileSync(
      path.join(RAIZ, "components/torneos/programador/useProgramadorBoard.ts"),
      "utf8",
    );
    const bloque = hook.slice(
      hook.indexOf("const intercambiarHorarios"),
      hook.indexOf("const asignarLote"),
    );
    assert.match(bloque, /catch \(e: unknown\)/);
    assert.match(bloque, /await fetchBoard/);
    assert.match(bloque, /applyBoard\(remoto\)/);
  });

  it("TorneosService expone endpoints PUT de intercambio", () => {
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/torneos.ts"),
      "utf8",
    );
    assert.match(svc, /programacion\/intercambiar/);
    assert.match(svc, /intercambiarEventoProgramacion/);
    assert.match(svc, /intercambiarProgramacion/);
  });
});