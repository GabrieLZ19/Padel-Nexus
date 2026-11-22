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

  it("MatchCard muestra Gan. #N en hueco vacío (como vista pública)", () => {
    const card = readFileSync(
      path.join(RAIZ, "components/torneos/MatchCard.tsx"),
      "utf8",
    );
    assert.match(card, /const emptyLabel =/);
    assert.match(card, /origenStr \|\|/);
    assert.doesNotMatch(
      card.slice(card.indexOf("renderEquipo")),
      /etiquetaSlotVacioLlave\(\{ origen,/,
    );
  });

  it("BracketEditor resuelve matriz FAP por vínculo matchNo, no solo orden", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /matchNoFapDePartidoId/);
    assert.match(editor, /matrizFapDePartido/);
    assert.match(editor, /origenesAlimentadoresEliminatoria/);
  });

  it("BracketEditor persiste validación de cabezas en sesión", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /sessionStorage/);
    assert.match(editor, /pn-validar-cabezas/);
    assert.match(editor, /MatchCard/);
  });

  it("utils exportan alimentadores Gan. #N para huecos de llave", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/etiquetaPareja.ts"),
      "utf8",
    );
    assert.match(util, /etiquetaAlimentadorPartido/);
    assert.match(util, /origenesAlimentadoresEliminatoria/);
    assert.match(util, /Gan\. #/);
  });

  it("PublicBracketView usa etiquetaSlotVacioLlave y alimentadores Gan. #N", () => {
    const vista = readFileSync(
      path.join(RAIZ, "components/torneos/PublicBracketView.tsx"),
      "utf8",
    );
    assert.match(vista, /origenesAlimentadoresEliminatoria/);
    assert.match(vista, /etiquetaSlotVacioLlave/);
    assert.doesNotMatch(
      vista.slice(vista.indexOf("BracketMatchCell")),
      /esByeB \? LIBRE : POR_DEFINIR/,
    );
  });

  it("MatchCard no marca bye si el hueco espera Gan. #N", () => {
    const card = readFileSync(
      path.join(RAIZ, "components/torneos/MatchCard.tsx"),
      "utf8",
    );
    assert.match(card, /origenEquipoA/);
    assert.match(card, /slotAEsBye[\s\S]*origenEquipoA/);
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
