import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { textoClasificacionZonaCorto } from "../utils/clasificacionZonas.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-69 legibilidad editor de zonas y modal llave", () => {
  it("textoClasificacionZonaCorto resume capacidad por zona", () => {
    assert.equal(textoClasificacionZonaCorto(4), "4 parejas · 3 clasifican");
    assert.equal(textoClasificacionZonaCorto(3), "3 parejas · 2 clasifican");
    assert.equal(textoClasificacionZonaCorto(2), "2 parejas · 1 clasifican");
  });

  it("DragDropPairing usa rótulo corto y nombre completo en edición", () => {
    const drag = readFileSync(
      path.join(RAIZ, "components/torneos/DragDropPairing.tsx"),
      "utf8",
    );
    assert.match(drag, /textoClasificacionZonaCorto/);
    assert.match(drag, /forzarNombreCompleto=\{isEditing\}/);
    assert.match(drag, /formatNombrePareja/);
  });

  it("PairDisplay admite forzar nombre completo", () => {
    const pair = readFileSync(
      path.join(RAIZ, "components/torneos/PairDisplay.tsx"),
      "utf8",
    );
    assert.match(pair, /forzarNombreCompleto/);
  });

  it("BracketEditor modal llave muestra semilla esperada en slot vacío", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /etiquetaOpcionVaciaSlot/);
    assert.match(editor, /origenLadoLlavePartido/);
    assert.doesNotMatch(
      editor,
      /label: "Vacío \/ BYE"/,
      "debe usar etiqueta dinámica por slot",
    );
  });

  it("resumen de zonas en edición omite leyenda larga FAP", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /isEditing && puedeEditarZonas/);
  });
});