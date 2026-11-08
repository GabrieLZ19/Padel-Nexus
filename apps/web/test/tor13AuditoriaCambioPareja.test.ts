import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  etiquetaAccionAuditoria,
  textoResumenAuditoriaTorneo,
} from "../utils/etiquetaAccionAuditoria.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-13 etiqueta auditoría cambio de pareja", () => {
  it("traduce acciones de override a español", () => {
    assert.equal(etiquetaAccionAuditoria("override_rival_partido"), "Cambio de pareja");
    assert.equal(etiquetaAccionAuditoria("cambio_pareja_llave"), "Cambio de pareja");
  });

  it("expone resumen persistido en detalles", () => {
    const detalles = {
      resumen:
        "Cambio de pareja · Partido #17 · Lado B: antes X, ahora Y",
    };
    assert.equal(textoResumenAuditoriaTorneo(detalles), detalles.resumen);
  });

  it("BracketEditor usa etiqueta y resumen", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /etiquetaAccionAuditoria/);
    assert.match(editor, /textoResumenAuditoriaTorneo/);
    assert.doesNotMatch(editor, /log\.accion\.replace\(\/_\/g/);
  });
});
