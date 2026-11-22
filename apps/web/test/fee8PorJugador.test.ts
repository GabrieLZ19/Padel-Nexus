import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-8 precio por jugador", () => {
  it("helpers en inscripcionMonto exportan monto sugerido y etiqueta", () => {
    const util = readFileSync(`${root}utils/inscripcionMonto.ts`, "utf8");
    assert.match(util, /ETIQUETA_PRECIO_POR_JUGADOR = "Por jugador"/);
    assert.match(util, /montoInscripcionSugeridoDesdeTorneo/);
    assert.match(util, /textoTotalParejaOpcional/);
  });

  it("ficha pública no muestra Por pareja", () => {
    const page = readFileSync(
      `${root}app/(public)/torneos/[id]/page.tsx`,
      "utf8",
    );
    assert.doesNotMatch(page, /Por pareja/);
    assert.match(page, /ETIQUETA_PRECIO_POR_JUGADOR/);
  });

  it("wizard Paso1 usa Precio por jugador", () => {
    const paso = readFileSync(
      `${root}components/torneos/wizard/Paso1Datos.tsx`,
      "utf8",
    );
    assert.match(paso, /Precio por jugador/);
  });

  it("manual recalcula monto con plazas", () => {
    const modal = readFileSync(
      `${root}components/inscripciones/InscripcionManualModal.tsx`,
      "utf8",
    );
    assert.match(modal, /montoInscripcionPublico/);
    assert.match(modal, /plazasInscripcionPublico/);
  });
});