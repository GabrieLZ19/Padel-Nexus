import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-5 menú finanzas solo superadmin", () => {
  it("admin_federacion sin finanzas ni liquidaciones", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/admin_federacion:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.doesNotMatch(bloque!, /\/dashboard\/finanzas/);
    assert.doesNotMatch(bloque!, /\/dashboard\/liquidaciones/);
  });

  it("superadmin conserva finanzas y liquidaciones", () => {
    const perms = readFileSync(
      `${root}utils/constants/menuPermissions.ts`,
      "utf8",
    );
    const bloque = perms.match(/superadmin:\s*\[[\s\S]*?\],/)?.[0];
    assert.ok(bloque);
    assert.match(bloque!, /\/dashboard\/finanzas/);
    assert.match(bloque!, /\/dashboard\/liquidaciones/);
  });
});