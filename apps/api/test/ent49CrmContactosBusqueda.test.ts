import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  tokenizarBusquedaJugadores,
  orBusquedaContactosAdmin,
  terminoIlikePostgrest,
} from "../src/utils/postgrestBusqueda.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-49 búsqueda por tokens en Base de contactos", () => {
  it("tokeniza los cuatro criterios QA (espacios y coma estilo apellido, nombre)", () => {
    assert.deepEqual(tokenizarBusquedaJugadores("Ensayo 30"), ["Ensayo", "30"]);
    assert.deepEqual(tokenizarBusquedaJugadores("QA Prueba Ensayo 30"), [
      "QA",
      "Prueba",
      "Ensayo",
      "30",
    ]);
    assert.deepEqual(tokenizarBusquedaJugadores("Ensayo 30 QA Prueba"), [
      "Ensayo",
      "30",
      "QA",
      "Prueba",
    ]);
    assert.deepEqual(tokenizarBusquedaJugadores("QA Prueba, Ensayo 30"), [
      "QA",
      "Prueba",
      "Ensayo",
      "30",
    ]);
  });

  it("CRM aplica un filtro or por cada token (AND)", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/crm-contactos.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async listar"),
      svc.indexOf("static async actualizarEtiquetas"),
    );
    assert.match(bloque, /tokenizarBusquedaJugadores/);
    assert.match(bloque, /orBusquedaContactosAdmin/);
    assert.doesNotMatch(
      bloque,
      /terminoIlikePostgrest\(search\)/,
    );
  });

  it("cada token busca en nombre, apellido, email y DNI", () => {
    const quoted = terminoIlikePostgrest("Ensayo");
    const filtro = orBusquedaContactosAdmin(quoted);
    assert.match(filtro, /nombre\.ilike/);
    assert.match(filtro, /apellido\.ilike/);
    assert.match(filtro, /email\.ilike/);
    assert.match(filtro, /dni\.ilike/);
  });
});