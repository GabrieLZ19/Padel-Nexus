import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("R4 - Pestaña Programación primero en Cuadros", () => {
  it("en BracketEditor el orden de pestañas es: Programación, Zonas/Fase de grupos, Llave campeonato, Auditoría", () => {
    const editor = fuente("components/torneos/BracketEditor.tsx");

    const tabBlockStart = editor.indexOf('<div className="flex justify-between items-center bg-transparent border-b');
    const tabBlockEnd = editor.indexOf('{activeView === "programacion" &&');
    const tabBlock = editor.slice(tabBlockStart, tabBlockEnd);

    // Verificar orden de aparición en el JSX del tab header
    const posProgramacion = tabBlock.indexOf('setActiveView("programacion")');
    const posZonas = tabBlock.indexOf('setActiveView("zonas")');
    const posSiembra = tabBlock.indexOf('setActiveView("siembra")');
    const posLlaves = tabBlock.indexOf('setActiveView("llaves")');
    const posAuditoria = tabBlock.indexOf('setActiveView("auditoria")');

    const posGruposOSiembra = Math.min(
      posZonas > 0 ? posZonas : Number.POSITIVE_INFINITY,
      posSiembra > 0 ? posSiembra : Number.POSITIVE_INFINITY,
    );

    assert.ok(posProgramacion > 0, "Debe existir la pestaña programacion");
    assert.ok(posZonas > 0, "Debe existir la pestaña zonas (fase de grupos)");
    assert.ok(posSiembra > 0, "Debe existir la pestaña siembra (eliminatoria directa)");
    assert.ok(posLlaves > 0, "Debe existir la pestaña llaves");
    assert.ok(posAuditoria > 0, "Debe existir la pestaña auditoria");

    assert.ok(
      posProgramacion < posGruposOSiembra,
      "Programación debe ir antes de Fase de grupos / Siembra",
    );
    assert.ok(
      posGruposOSiembra < posLlaves,
      "Fase de grupos o Siembra debe ir antes de Llave campeonato",
    );
    assert.ok(
      posLlaves < posAuditoria,
      "Llave campeonato debe ir antes de Auditoría",
    );
  });

  it("el estado inicial de activeView en BracketEditor es 'programacion'", () => {
    const editor = fuente("components/torneos/BracketEditor.tsx");
    assert.ok(
      editor.includes('>("programacion")'),
      "activeView debe iniciar en 'programacion'",
    );
  });

  it("ProgramacionEntryPanel menciona la grilla hasta medianoche (00:00) y no 21:00", () => {
    const panel = fuente("components/torneos/programador/ProgramacionEntryPanel.tsx");
    assert.equal(panel.includes("21:00"), false, "No debe decir 21:00");
    assert.ok(panel.includes("00:00"), "Debe mencionar 00:00");
  });
});
