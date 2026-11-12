import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Espejo del util web para poder testear sin loader TS. */
function licenciasComoArray(
  licencias?: { id: string; estado?: string } | { id: string; estado?: string }[] | null,
): { id: string; estado?: string }[] {
  if (!licencias) return [];
  return Array.isArray(licencias) ? licencias : [licencias];
}

function licenciaPreferidaListado(
  licencias?: { id: string; estado?: string } | { id: string; estado?: string }[] | null,
): { id: string; estado?: string } | null {
  const licList = licenciasComoArray(licencias);
  if (licList.length === 0) return null;
  return (
    licList.find((l) => l.estado === "Pendiente") ||
    licList.find((l) => l.estado === "Activa") ||
    licList.find((l) => l.estado === "Vencida") ||
    licList[0]
  );
}

describe("licenciasArray — objeto vs array del API", () => {
  it("licenciasComoArray acepta un solo objeto", () => {
    const uno = { id: "1", estado: "Activa" };
    assert.deepEqual(licenciasComoArray(uno), [uno]);
    assert.deepEqual(licenciasComoArray([uno]), [uno]);
    assert.deepEqual(licenciasComoArray(null), []);
  });

  it("licenciaPreferidaListado prioriza Pendiente sobre Activa", () => {
    const lista = [
      { id: "a", estado: "Activa" },
      { id: "b", estado: "Pendiente" },
    ];
    assert.equal(licenciaPreferidaListado(lista)?.id, "b");
    assert.equal(licenciaPreferidaListado(lista[1])?.id, "b");
  });

  it("mi-perfil y ficha jugador normalizan licencias del API", () => {
    const miPerfil = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/page.tsx"),
      "utf8",
    );
    assert.match(miPerfil, /licenciasComoArray/);

    const ficha = readFileSync(
      path.join(RAIZ, "app/dashboard/jugadores/[id]/page.tsx"),
      "utf8",
    );
    assert.match(ficha, /licenciasComoArray/);
  });

  it("el listado de jugadores no usa .find sobre licencias sin normalizar", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/dashboard/jugadores/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /licenciaPreferidaListado/);
    assert.doesNotMatch(pagina, /const getDisplayLicencia/);
    assert.match(pagina, /licenciasComoArray/);
    const util = readFileSync(
      path.join(RAIZ, "utils/licenciasArray.ts"),
      "utf8",
    );
    assert.match(util, /Array\.isArray\(licencias\)/);
  });
});
