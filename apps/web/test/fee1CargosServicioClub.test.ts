import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-1 panel club cargos-servicio", () => {
  it("existe ruta /club/cargos-servicio", () => {
    const page = readFileSync(
      `${root}app/club/cargos-servicio/page.tsx`,
      "utf8",
    );
    assert.match(page, /CargosServicioPanel/);
  });

  it("menú club incluye Cargo por servicio", () => {
    const layout = readFileSync(`${root}app/club/layout.tsx`, "utf8");
    assert.match(layout, /\/club\/cargos-servicio/);
    assert.match(layout, /Cargo por servicio/);
  });

  it("admin_club no tiene cargos-servicio en dashboard", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/admin_club:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.doesNotMatch(bloque!, /cargos-servicio/);
  });

  it("superadmin no tiene cargos-servicio en dashboard", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/superadmin:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.doesNotMatch(bloque!, /cargos-servicio/);
  });
});