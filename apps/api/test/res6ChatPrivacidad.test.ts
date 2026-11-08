import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

function cuerpoBuscarContactosGrupo(src: string): string {
  const inicio = src.indexOf("static async buscarContactosGrupo");
  assert.ok(inicio >= 0, "buscarContactosGrupo debe existir");
  const fin = src.indexOf("static async obtenerDestinatarios", inicio);
  assert.ok(fin > inicio, "debe delimitar el método buscarContactosGrupo");
  return src.slice(inicio, fin);
}

describe("RES-6 privacidad buscador chat (grupos)", () => {
  it("backend solo busca por nombre/apellido, excluye menores y no devuelve email", () => {
    const chatService = fuente("apps/api/src/services/chat.service.ts");
    const bloque = cuerpoBuscarContactosGrupo(chatService);

    assert.match(bloque, /\.eq\("es_menor", false\)/);
    assert.match(bloque, /nombre\.ilike/);
    assert.match(bloque, /apellido\.ilike/);
    assert.doesNotMatch(bloque, /email\.ilike/);
    assert.doesNotMatch(bloque, /dni\.ilike/);
    assert.doesNotMatch(bloque, /select\("id, nombre, apellido, email/);
  });

  it("UI del modal no muestra email ni invita a buscar por DNI", () => {
    const modal = fuente("apps/web/components/chat/NuevoGrupoModal.tsx");
    assert.match(modal, /placeholder="Nombre o apellido/);
    assert.doesNotMatch(modal, /email o DNI/i);
    assert.doesNotMatch(modal, /\.email/);
  });

  it("tipo ChatContactoBusqueda no incluye email", () => {
    const tipos = fuente("apps/web/utils/types/chat.types.ts");
    const inicio = tipos.indexOf("export interface ChatContactoBusqueda");
    assert.ok(inicio >= 0);
    const fin = tipos.indexOf("}", inicio);
    const bloque = tipos.slice(inicio, fin);
    assert.doesNotMatch(bloque, /email/);
  });
});
