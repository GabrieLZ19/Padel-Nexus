import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("P3: zona refleja sorteo y auditoría lo lista", () => {
  it("BracketEditor preserva sorteo_posicion y sorteo_motivo al mapear zonas", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(fuente, /sorteo_posicion:\s*gp\.sorteo_posicion\s*\?\?\s*null/);
    assert.match(fuente, /sorteo_motivo:\s*gp\.sorteo_motivo\s*\?\?\s*null/);
  });

  it("la vista pública también preserva el sorteo aplicado", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(fuente, /sorteo_posicion:\s*gp\.sorteo_posicion\s*\?\?\s*null/);
    assert.match(fuente, /sorteo_motivo:\s*gp\.sorteo_motivo\s*\?\?\s*null/);
  });

  it("TablaPosicionesZona limpia Pendiente sorteo cuando hay sorteo_posicion", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/TablaPosicionesZona.tsx"),
      "utf8",
    );
    assert.match(fuente, /allHaveSorteo/);
    assert.match(fuente, /sorteo_posicion:\s*p\.sorteo_posicion/);
    assert.match(fuente, /Pendiente sorteo/);
  });
});
