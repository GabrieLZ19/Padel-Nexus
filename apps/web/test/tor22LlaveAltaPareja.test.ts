import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-22 editor de llaves: otra categoría o DNI", () => {
  it("BracketEditor integra panel de alta y servicios", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /LlaveAltaParejaPanel/);
    assert.match(editor, /inscripcionesExtraLlave/);

    const panel = readFileSync(
      path.join(RAIZ, "components/torneos/LlaveAltaParejaPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /Otro torneo/);
    assert.match(panel, /Alta por DNI/);
    assert.match(panel, /Preparar/);
    assert.match(panel, /guardar el partido/);
    assert.match(panel, /excluidasEnTorneo/);
    assert.match(panel, /busquedaEjecutada/);

    const diagrama = readFileSync(
      path.join(RAIZ, "components/torneos/FapBracketDiagram.tsx"),
      "utf8",
    );
    assert.match(diagrama, /Editar/);
    assert.match(diagrama, /slotFocus/);

    const svc = readFileSync(
      path.join(RAIZ, "utils/services/torneos.ts"),
      "utf8",
    );
    assert.match(svc, /buscarParejasLlaveExternas/);
    assert.match(svc, /excluidas_en_torneo/);
    assert.match(svc, /alta_lado_a/);

    assert.doesNotMatch(editor, /resolverIdInscripcionParaGuardar/);
    assert.match(editor, /alta_lado_a/);
    assert.match(editor, /resolverLadoParaGuardarPartido/);
  });
});
