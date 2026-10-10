import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { textoRectora } from "../utils/textosRectora.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("GEN-07 entidad rectora", () => {
  it("arma los cinco textos con la sigla que se le pasa", () => {
    assert.equal(textoRectora("puntos", "FAP"), "Puntos FAP");
    assert.equal(textoRectora("reglamento", "FAP"), "Reglamento FAP");
    assert.equal(textoRectora("licencias", "FAP"), "licencias FAP");
    assert.equal(textoRectora("plantilla", "FAP"), "Plantilla FAP");
    assert.equal(textoRectora("afiliadas", "FAP"), "Entidades afiliadas FAP");

    assert.equal(textoRectora("puntos", "FNP"), "Puntos FNP");
    assert.equal(textoRectora("reglamento", "FNP"), "Reglamento FNP");
    assert.equal(textoRectora("licencias", "FNP"), "licencias FNP");
    assert.equal(textoRectora("plantilla", "FNP"), "Plantilla FNP");
    assert.equal(textoRectora("afiliadas", "FNP"), "Entidades afiliadas FNP");
  });

  it("sigue encontrando la federación argentina si la sigla deja de ser FAP", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "utils/services/federaciones.ts"),
      "utf8",
    );
    assert.match(fuente, /federaci\[oó\]n argentina/i);
  });

  it("las pantallas no dejan esas frases escritas a mano", () => {
    const pantallas = [
      "components/dashboard/DashboardFederacion.tsx",
      "components/torneos/FapBracketDiagram.tsx",
      "components/torneos/BracketEditor.tsx",
      "components/torneos/wizard/Paso7Cierre.tsx",
      "app/(public)/torneos/[id]/page.tsx",
    ];
    const fijas = [
      "Puntos FAP",
      "Reglamento FAP",
      "licencias FAP",
      "Plantilla FAP",
      "Entidades afiliadas FAP",
    ];
    for (const relativo of pantallas) {
      const limpio = readFileSync(path.join(RAIZ, relativo), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const frase of fijas) {
        assert.equal(limpio.includes(frase), false, `${relativo} ${frase}`);
      }
      assert.match(limpio, /textoRectora\(/);
    }
  });
});
