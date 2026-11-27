import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-27 — rendimiento programador maestro (evento)", () => {
  it("getBoard de evento omite cruzados por categoría y mergea una vez", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(svc, /omitirCruzadosEnBoardTorneo:\s*true/);
    assert.match(svc, /mergeBoardsEvento\(grupoId, meta, boards\)/);

    const prog = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(prog, /omitirCruzadosEnBoardTorneo\?: boolean/);
    assert.match(
      prog,
      /if \(grupoId && !opciones\.omitirCruzadosEnBoardTorneo\)/,
    );
  });

  it("persistirConfig y publicar de evento evitan getBoard por categoría", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(svc, /persistirConfigProgramacion\(t\.id,\s*\{[\s\S]*omitirBoard:\s*true/);
    assert.match(svc, /omitirValidacionBoard:\s*publicarVarias/);
    assert.match(svc, /const preBoard = await ProgramacionEventoService\.getBoard/);
  });

  it("autoAsignar de evento refresca partidos de una categoría sin recargar todo el evento", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(svc, /\.eq\("torneo_id", torneoId\)/);
    assert.doesNotMatch(
      svc,
      /await ProgramacionService\.autoAsignar[\s\S]{0,400}cargarPartidosProgramablesEvento\(grupoId\)/,
      "no debe recargar todo el evento tras cada auto por categoría",
    );
  });
});