import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * GEN-04: Resultados, Cuadros y el paso 1 no tienen texto informativo
 * de menos de 12 px. El gris de rótulos es #8B93A1 o más claro sobre #121212.
 */
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PANTALLAS = [
  "components/torneos/wizard/Paso1Datos.tsx",
  "components/torneos/wizard/Paso8Cuadros.tsx",
  "components/torneos/wizard/Paso9Arbitraje.tsx",
  "components/torneos/TournamentWizardNav.tsx",
  "components/torneos/LiveArbitrajeRow.tsx",
  "components/torneos/MatchTeamBox.tsx",
  "components/torneos/BracketEditor.tsx",
  "components/torneos/FapBracketDiagram.tsx",
  "components/torneos/MatchCard.tsx",
  "components/torneos/PairDisplay.tsx",
  "components/torneos/DragDropPairing.tsx",
  "components/torneos/ZonaCard.tsx",
  "components/torneos/TablaPosicionesZona.tsx",
  "components/torneos/PromoverParejaMenores.tsx",
  "components/torneos/programador/ProgramacionEntryPanel.tsx",
  "components/ui/CustomDropdown.tsx",
  "utils/marcadorSets.ts",
];

function canal(valor: number): number {
  const s = valor / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(frente: string, fondo: string): number {
  const a = luminancia(frente);
  const b = luminancia(fondo);
  const claro = Math.max(a, b);
  const oscuro = Math.min(a, b);
  return (claro + 0.05) / (oscuro + 0.05);
}

function textosBajo12(fuente: string): string[] {
  const hallados: string[] = [];
  for (const match of fuente.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
    const px = Number(match[1]);
    if (px < 12) hallados.push(match[0]);
  }
  for (const match of fuente.matchAll(/text-\[(\d+(?:\.\d+)?)rem\]/g)) {
    const px = Number(match[1]) * 16;
    if (px < 12) hallados.push(match[0]);
  }
  for (const match of fuente.matchAll(/fontSize:\s*["']?(\d+(?:\.\d+)?)px/g)) {
    const px = Number(match[1]);
    if (px < 12) hallados.push(match[0]);
  }
  return hallados;
}

describe("GEN-04 texto mínimo y contraste", () => {
  it("Resultados, Cuadros y el paso 1 no declaran texto informativo de menos de 12 px", () => {
    const chicos: string[] = [];
    for (const relativo of PANTALLAS) {
      const fuente = readFileSync(path.join(RAIZ, relativo), "utf8");
      const hallados = textosBajo12(fuente);
      if (hallados.length > 0) {
        chicos.push(`${relativo}: ${hallados.join(", ")}`);
      }
    }
    assert.deepEqual(chicos, []);
  });

  it("el gris de rótulos llega a 4,5:1 y es #8B93A1 o más claro sobre #121212", () => {
    const css = readFileSync(path.join(RAIZ, "app/globals.css"), "utf8");
    const oscuro = css.match(
      /@theme\s*\{[\s\S]*?--color-brand-ayuda:\s*(#[0-9A-Fa-f]{6})/,
    );
    const claro = css.match(
      /html\.light\s*\{[\s\S]*?--color-brand-ayuda:\s*(#[0-9A-Fa-f]{6})/,
    );
    assert.ok(oscuro?.[1], "falta --color-brand-ayuda en el tema oscuro");
    assert.ok(claro?.[1], "falta --color-brand-ayuda en modo claro");

    const ayuda = oscuro[1];
    const piso = "#8B93A1";
    assert.ok(luminancia(ayuda) + 0.0001 >= luminancia(piso));
    assert.ok(contraste(ayuda, "#121212") >= 4.5);

    const ayudaClara = claro[1];
    assert.ok(contraste(ayudaClara, "#ffffff") >= 4.5);
    assert.ok(contraste(ayudaClara, "#f1f5f9") >= 4.5);
  });

  it("esas pantallas no usan el gris de rótulos por debajo de 4,5:1", () => {
    for (const relativo of PANTALLAS) {
      const fuente = readFileSync(path.join(RAIZ, relativo), "utf8");
      for (const clase of ["text-gray-500", "text-gray-600"]) {
        assert.equal(
          fuente.includes(clase),
          false,
          `${relativo} sigue usando ${clase}`,
        );
      }
    }
  });
});
