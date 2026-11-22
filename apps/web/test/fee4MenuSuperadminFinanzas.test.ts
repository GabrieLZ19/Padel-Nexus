import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-4 menú Finanzas superadmin", () => {
  it("grupo Finanzas agrupa fees, finanzas y liquidaciones", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/id:\s*"finanzas"[\s\S]*?hrefs:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.match(bloque!, /label:\s*"Finanzas"/);
    assert.match(bloque!, /\/dashboard\/platform-fees/);
    assert.match(bloque!, /\/dashboard\/finanzas/);
    assert.match(bloque!, /\/dashboard\/liquidaciones/);
  });

  it("superadmin tiene permiso en las tres rutas de finanzas", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/superadmin:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.match(bloque!, /\/dashboard\/platform-fees/);
    assert.match(bloque!, /\/dashboard\/finanzas/);
    assert.match(bloque!, /\/dashboard\/liquidaciones/);
  });

  it("superadmin no ve Cargos servicio en dashboard", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/superadmin:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.doesNotMatch(bloque!, /cargos-servicio/);
  });

  it("layout define entradas de menú para finanzas", () => {
    const layout = readFileSync(`${root}app/dashboard/layout.tsx`, "utf8");
    assert.match(layout, /Fees plataforma/);
    assert.match(layout, /\/dashboard\/platform-fees/);
    assert.match(layout, /\/dashboard\/finanzas/);
    assert.match(layout, /\/dashboard\/liquidaciones/);
    assert.match(layout, /SuperadminSidebarNav/);
  });
});