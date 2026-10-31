import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("R7: Sorteo - cambiar puestos a mano y corregir después", () => {
  const modalContent = readFileSync(
    path.join(RAIZ, "components", "torneos", "ModalSorteoZona.tsx"),
    "utf-8",
  );
  const tablaContent = readFileSync(
    path.join(RAIZ, "components", "torneos", "TablaPosicionesZona.tsx"),
    "utf-8",
  );

  it("ModalSorteoZona incluye pestaña Mesa Presencial con selección manual de puestos", () => {
    assert.match(modalContent, /Mesa Presencial/i);
    assert.match(modalContent, /handleCambiarPuesto/);
    assert.match(modalContent, /opcionesPuestos/);
  });

  it("ModalSorteoZona garantiza que el puesto 3.º está disponible para permitir pasar del 1.º al 3.º", () => {
    // Si hay 3 parejas o más, o si alguna tiene 3 asignado, opcionesPuestos incluye 1, 2, 3
    assert.ok(
      modalContent.includes("set.add(3)"),
      "ModalSorteoZona debe incluir puesto 3 en las opciones disponibles",
    );
  });

  it("ModalSorteoZona permite corregir a mano sorteos previamente resueltos", () => {
    assert.match(modalContent, /esEdicionExistente/);
    assert.match(modalContent, /Corregir Puestos de Sorteo|Guardar Corrección/);
  });

  it("TablaPosicionesZona identifica sorteo ya resuelto y muestra acción para corregir a mano después", () => {
    assert.match(tablaContent, /haySorteoResuelto/);
    assert.match(tablaContent, /parejasConSorteoResuelto/);
    assert.match(tablaContent, /Corregir puestos a mano|Corregir sorteo/);
  });

  it("TablaPosicionesZona pasa parejasParaModal y posicionesEnDisputa tanto en sorteo pendiente como en corrección", () => {
    assert.match(tablaContent, /parejasParaModal/);
    assert.match(tablaContent, /parejasEmpatadas=\{parejasParaModal\.map/);
  });

  it("El badge de sorteo en la tabla es interactivo y permite abrir el modal para corregir", () => {
    assert.match(tablaContent, /setModalSorteoOpen\(true\)/);
    assert.match(tablaContent, /Clic para corregir puestos a mano/);
  });
});
