import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_ENT34 = path.resolve(
  RAIZ,
  "../../supabase/migrations/20261125183000_ent34_licencias_indices_resumen.sql",
);
const MIGRATION_ENT37 = path.resolve(
  RAIZ,
  "../../supabase/migrations/20261125194500_ent37_busqueda_jugadores_tokens.sql",
);

describe("ENT-34 licencias sin paginar en memoria", () => {
  it("migración define índices y RPC de resumen", () => {
    const sql = readFileSync(MIGRATION_ENT34, "utf8");
    assert.match(sql, /idx_perfiles_dni/);
    assert.match(sql, /idx_licencias_usuario_id/);
    assert.match(sql, /pg_trgm/);
    assert.match(sql, /licencias_resumen_jugadores/);
    assert.match(sql, /licencias_perfiles_ids_paginados/);
  });

  it("obtenerLicencias provincial usa RPC paginada", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /licencias_perfiles_ids_paginados/);
    assert.doesNotMatch(
      svc,
      /range\(0, 499\)[\s\S]*alcanceProvincial/,
    );
  });

  it("resumenEstados delega en licencias_resumen_jugadores", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /rpc\("licencias_resumen_jugadores"/);
    assert.doesNotMatch(svc, /resumenDesdeTablaLicencias/);
    assert.doesNotMatch(svc, /pageSize = 1000/);
  });
});

describe("ENT-37 búsqueda por tokens", () => {
  it("migración define perfil_token_matchea_jugador y p_tokens en RPC", () => {
    const sql = readFileSync(MIGRATION_ENT37, "utf8");
    assert.match(sql, /perfil_token_matchea_jugador/);
    assert.match(sql, /perfil_texto_norm/);
    assert.match(sql, /p_tokens text\[\]/);
  });

  it("tokenizarBusquedaJugadores separa nombre y apellido", async () => {
    const { tokenizarBusquedaJugadores } = await import(
      "../src/utils/postgrestBusqueda.ts"
    );
    assert.deepEqual(tokenizarBusquedaJugadores("García Juan"), [
      "García",
      "Juan",
    ]);
    assert.deepEqual(tokenizarBusquedaJugadores("  juan   garcía  "), [
      "juan",
      "garcía",
    ]);
  });

  it("obtenerLicencias aplica un filtro or por cada token", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /tokenizarBusquedaJugadores/);
    assert.match(svc, /orBusquedaTokenJugadoresLicencias/);
    assert.match(svc, /p_tokens/);
    assert.doesNotMatch(svc, /p_search:/);
  });
});