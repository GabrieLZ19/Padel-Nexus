import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-36 etiquetas y UX en llave", () => {
  it("etiquetaSlotVacioLlave prioriza Por definir si hay origen", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/etiquetaPareja.ts"),
      "utf8",
    );
    assert.match(util, /export function etiquetaSlotVacioLlave/);
    assert.match(util, /if \(origen\) return POR_DEFINIR/);
  });

  it("MatchCard usa etiquetaSlotVacioLlave", () => {
    const card = readFileSync(
      path.join(RAIZ, "components/torneos/MatchCard.tsx"),
      "utf8",
    );
    assert.match(card, /etiquetaSlotVacioLlave/);
    assert.doesNotMatch(
      card.slice(card.indexOf("renderEquipo")),
      /esBye && !origen \? LIBRE/,
    );
  });

  it("BracketEditor persiste validación de cabezas en sesión", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /sessionStorage/);
    assert.match(editor, /pn-validar-cabezas/);
    assert.match(editor, /Por definir/);
  });

  it("FapBracketDiagram propaga origen Gan. #N al MatchCard", () => {
    const diagram = readFileSync(
      path.join(RAIZ, "components/torneos/FapBracketDiagram.tsx"),
      "utf8",
    );
    assert.match(diagram, /Gan\. #/);
    assert.match(diagram, /origenEquipoA=\{formatSeed/);
  });
});
