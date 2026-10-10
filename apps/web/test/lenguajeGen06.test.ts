import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  etiquetaCategoria,
  etiquetaNivelYCategoria,
} from "../utils/etiquetaCategoria.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function archivos(dir: string, acc: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre === ".next" || nombre === "test") continue;
    const full = path.join(dir, nombre);
    if (statSync(full).isDirectory()) archivos(full, acc);
    else if (/\.tsx$/.test(nombre)) acc.push(full);
  }
  return acc;
}

function textosVisibles(src: string): string {
  const limpio = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const partes: string[] = [];
  for (const cita of limpio.matchAll(
    /`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\n])*"|'(?:\\.|[^'\n])*'/g,
  )) {
    const texto = cita[0].replace(/\$\{[^}]*\}/g, "");
    if (texto.includes("/marketplace/") || /^["'`][./]/.test(texto)) continue;
    partes.push(texto);
  }
  for (const nodo of limpio.matchAll(/>([^<>{}]+)</g)) {
    const texto = nodo[1].trim();
    if (!texto || /[{}=;]|const |function |return |import /.test(texto)) continue;
    partes.push(texto);
  }
  return partes.join("\n");
}

describe("GEN-06 voseo y categoría", () => {
  it("muestra la categoría siempre como 7ª", () => {
    for (const valor of ["7", "7a", "7ª", "7º", "7°"]) {
      assert.equal(etiquetaCategoria(valor), "7ª");
    }
    assert.equal(etiquetaCategoria("6TA"), "6ª");
    assert.equal(etiquetaCategoria("6ta"), "6ª");
    assert.equal(etiquetaNivelYCategoria("6TA", "6TA"), "6ª");
    assert.equal(etiquetaCategoria("Libres"), "Libres");
    assert.equal(etiquetaCategoria("Sub-12"), "Sub-12");
    assert.equal(etiquetaCategoria("Caballeros"), "Caballeros");
  });

  it("no muestra account, Verifique, Selecciona, categorias ni segun", () => {
    const prohibidas = [
      /\baccount\b/i,
      /\bVerifique\b/,
      /\bSelecciona\b/,
      /\bcategorias\b/,
      /\bsegun\b/,
    ];
    for (const archivo of archivos(RAIZ)) {
      const visible = textosVisibles(readFileSync(archivo, "utf8"));
      for (const regla of prohibidas) {
        assert.equal(
          regla.test(visible),
          false,
          `${path.relative(RAIZ, archivo)} ${regla}`,
        );
      }
    }
  });
});
