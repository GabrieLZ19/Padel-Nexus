import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { torneoUsaMarcasReglamentoFederacion } from "../utils/constants/fapApaRules.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Ola 3 ítem 15 — TOR-73 / TOR-68 / TOR-56", () => {
  it("TOR-73: torneos club Local no usan marcas FAP en copy", () => {
    assert.equal(
      torneoUsaMarcasReglamentoFederacion({
        reglamento: "Amateur",
        alcance: "Local",
      }),
      false,
    );
    assert.equal(
      torneoUsaMarcasReglamentoFederacion({
        reglamento: "FAP",
        alcance: "Local",
      }),
      false,
    );
    assert.equal(
      torneoUsaMarcasReglamentoFederacion({
        reglamento: "FAP",
        alcance: "Provincial",
      }),
      true,
    );
  });

  it("TOR-73: BracketEditor y diagrama usan Cuadro principal en club", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /Cuadro principal/);
    assert.match(editor, /torneoUsaMarcasReglamentoFederacion/);
    const diagram = readFileSync(
      path.join(RAIZ, "components/torneos/FapBracketDiagram.tsx"),
      "utf8",
    );
    assert.match(diagram, /Cuadro principal/);
  });

  it("TOR-68: planilla pide confirmación con FeedbackModal", () => {
    const paso4 = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso4Jugadores.tsx"),
      "utf8",
    );
    assert.match(paso4, /descripcionConfirmacionImportPlanilla/);
    assert.match(paso4, /Confirmar importación de planilla/);
  });

  it("TOR-56: Paso 7 oculta ranking y banner de puntos en torneo prueba", () => {
    const cierre = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso7Cierre.tsx"),
      "utf8",
    );
    assert.match(cierre, /motivoTorneoPrueba/);
    assert.match(cierre, /\/planilla\/i\.test\(ins\.tipo/);
    assert.match(cierre, /inscripcionesPlanillaConfirmadas/);
    assert.match(cierre, /motivoTorneoPrueba \? "hidden"/);
  });

  it("TOR-56 / Paso 1: club en borrador arranca Local y Amateur", () => {
    const paso1 = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.match(paso1, /esRolClub\(userRole\)/);
    assert.match(paso1, /return "Local"/);
    assert.match(paso1, /return "Amateur"/);
  });
});