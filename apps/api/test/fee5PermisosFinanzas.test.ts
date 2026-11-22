import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-5 permisos saldo torneo y liquidaciones", () => {
  it("reporte y liquidaciones solo superadmin en rutas", () => {
    const routes = readFileSync(
      `${root}src/routes/platformFee.routes.ts`,
      "utf8",
    );
    const bloques = [
      routes.match(/router\.get\(\s*"\/?reporte-mensual"[\s\S]*?\);/)?.[0],
      routes.match(
        /router\.get\(\s*"\/?liquidaciones\/resumen"[\s\S]*?\);/,
      )?.[0],
      routes.match(
        /router\.get\(\s*"\/?liquidaciones\/historial"[\s\S]*?\);/,
      )?.[0],
      routes.match(
        /router\.get\(\s*"\/?liquidaciones\/pendientes"[\s\S]*?\);/,
      )?.[0],
      routes.match(/router\.post\(\s*"\/?liquidaciones"[\s\S]*?\);/)?.[0],
    ];
    for (const bloque of bloques) {
      assert.ok(bloque, "Ruta de finanzas/liquidaciones esperada");
      assert.match(bloque!, /authorize\(\["superadmin"\]\)/);
      assert.doesNotMatch(bloque!, /admin_federacion/);
    }
  });

  it("saldo torneo valida organizador en controlador", () => {
    const ctrl = readFileSync(
      `${root}src/controllers/platformFee.controller.ts`,
      "utf8",
    );
    assert.match(ctrl, /usuarioPuedeSaldoTorneo/);
    assert.match(ctrl, /No autorizado para el saldo de este torneo/);
    assert.match(ctrl, /No autorizado para pagar el saldo de este torneo/);
  });

  it("util compara org usuario con org del torneo", () => {
    const util = readFileSync(
      `${root}src/utils/platformFeeOrgUsuario.ts`,
      "utf8",
    );
    assert.match(util, /usuarioPuedeSaldoTorneo/);
    assert.match(util, /resolverOrgDesdeTorneo/);
  });
});