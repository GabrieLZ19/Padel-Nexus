import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-16 superadmin en /dashboard/cargos-servicio", () => {
  it("layout del dashboard bloquea acceso sin permiso de menú", () => {
    const layout = readFileSync(
      `${root}app/dashboard/cargos-servicio/layout.tsx`,
      "utf8",
    );
    assert.match(layout, /puedeAccederRutaDashboard/);
    assert.match(layout, /router\.replace/);
    assert.match(layout, /platform-fees/);
  });

  it("superadmin no tiene /dashboard/cargos-servicio en MENU_POR_ROL", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/superadmin:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.doesNotMatch(bloque!, /cargos-servicio/);
  });

  it("federación y asociación sí pueden acceder por menú", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const fed = perms.match(/admin_federacion:\s*\[[\s\S]*?\],/)?.[0];
    const prov = perms.match(/admin_provincial:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(fed);
    assert.ok(prov);
    assert.match(fed!, /\/dashboard\/cargos-servicio/);
    assert.match(prov!, /\/dashboard\/cargos-servicio/);
  });
});