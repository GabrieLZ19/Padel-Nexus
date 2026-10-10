import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

function constante(texto: string, nombre: string): number {
  const match = texto.match(new RegExp(`export const ${nombre} = (\\d+)`));
  assert.ok(match, nombre);
  return Number(match[1]);
}

/** Misma cuenta que filasJugadoresVisibles, leída de la fuente. */
function filasVisibles(altoViewport: number, cromo: number, fila: number): number {
  const libre = altoViewport - cromo;
  if (libre <= 0) return 0;
  return Math.floor(libre / fila);
}

describe("JUG-01 jugadores en tabla", () => {
  it("a 1366×641 entran al menos 10 filas y la página pide al menos esas", () => {
    const listado = fuente("utils/jugadoresListado.ts");
    const pageSize = constante(listado, "PAGE_SIZE_JUGADORES");
    const altoFila = constante(listado, "ALTO_FILA_JUGADOR_PX");
    const altoCromo = constante(listado, "ALTO_CROMO_JUGADORES_PX");
    assert.match(listado, /Math\.floor\(libre \/ ALTO_FILA_JUGADOR_PX\)/);
    assert.ok(pageSize >= 10);
    assert.equal(altoFila, 36);
    assert.ok(altoCromo + 10 * altoFila <= 641);
    assert.ok(filasVisibles(641, altoCromo, altoFila) >= 10);
  });

  it("la gestión diaria es una tabla y el carnet vive en Configuración", () => {
    const pagina = fuente("app/dashboard/jugadores/page.tsx");
    const fila = fuente("components/licencias/LicenciaJugadorCard.tsx");

    assert.match(pagina, /PAGE_SIZE_JUGADORES/);
    assert.match(pagina, /<table/);
    for (const columna of [
      "Jugador",
      "DNI",
      "Categoría",
      "N° licencia",
      "Estado",
      "Vencimiento",
      "Acciones",
    ]) {
      assert.match(pagina, new RegExp(`>${columna}<`));
    }

    assert.match(pagina, /vista === "configuracion"/);
    assert.match(pagina, />\s*Configuración\s*</);
    const panel = pagina.indexOf("<ConfigLicenciasPanel");
    const vista = pagina.indexOf('vista === "configuracion"');
    assert.ok(vista !== -1 && panel > vista);
    assert.equal(pagina.split("<ConfigLicenciasPanel").length - 1, 1);
    assert.equal(pagina.includes("grid-cols-[minmax(240px,280px)"), false);
    assert.equal(pagina.includes("Parámetros del carnet"), false);

    assert.match(fila, /data-fila-jugador/);
    assert.match(fila, /ALTO_FILA_JUGADOR_PX/);
    assert.match(fila, /<tr/);
    assert.match(fila, /<article/);
    assert.match(fila, /presentacion === "tarjeta"/);
    assert.match(pagina, /presentacion="tarjeta"/);
    assert.match(pagina, /xl:hidden/);
    assert.match(pagina, /xl:block/);
    assert.match(pagina, /variante="seccion"/);
    assert.equal(pagina.includes("max-w-xl"), false);
    assert.match(fila, /<MenuPuntos/);
    assert.match(fila, /label: "Revocar"/);
    assert.match(fila, /danger: true/);
  });
});
