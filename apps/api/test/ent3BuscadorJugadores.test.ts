import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  orBusquedaJugadoresLicencias,
  terminoIlikePostgrest,
} from "../src/utils/postgrestBusqueda.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

function cuerpoObtenerLicencias(src: string): string {
  const inicio = src.indexOf("static async obtenerLicencias");
  assert.ok(inicio >= 0);
  const fin = src.indexOf("static async resumenDesdeTablaLicencias", inicio);
  assert.ok(fin > inicio);
  return src.slice(inicio, fin);
}

describe("ENT-3 buscador jugadores federación/superadmin", () => {
  it("terminoIlikePostgrest cita el patrón para emails con @", () => {
    const quoted = terminoIlikePostgrest("qa@padel.com");
    assert.match(quoted, /^"%.*%"$/);
    assert.ok(quoted.includes("@"));
    assert.doesNotMatch(quoted, /^%qa@/);
  });

  it("orBusquedaJugadoresLicencias solo filtra columnas de perfiles", () => {
    const quoted = terminoIlikePostgrest("30123456");
    const filtro = orBusquedaJugadoresLicencias(quoted);
    assert.match(filtro, /dni\.ilike/);
    assert.doesNotMatch(filtro, /licencias\./);
    assert.match(filtro, /nombre\.ilike/);
    assert.match(filtro, /apellido\.ilike/);
  });

  it("orBusquedaJugadoresLicencias une ids de nro_licencia sin embed", () => {
    const quoted = terminoIlikePostgrest("PAD-7MBWT2");
    const filtro = orBusquedaJugadoresLicencias(quoted, [
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    ]);
    assert.match(filtro, /id\.in\.\("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"\)/);
    assert.doesNotMatch(filtro, /licencias\./);
  });

  it("obtenerLicencias usa util compartida y no arma term sin comillas", () => {
    const licencias = fuente("apps/api/src/services/licencia.service.ts");
    const bloque = cuerpoObtenerLicencias(licencias);
    assert.match(bloque, /terminoIlikePostgrest/);
    assert.match(bloque, /orBusquedaJugadoresLicencias/);
    assert.match(bloque, /usuarioIdsPorBusquedaNroLicencia/);
    assert.doesNotMatch(bloque, /const term = `%/);
  });

  it("UI /dashboard/jugadores menciona DNI en el placeholder", () => {
    const pagina = fuente("apps/web/app/dashboard/jugadores/page.tsx");
    assert.match(pagina, /DNI/);
  });
});
