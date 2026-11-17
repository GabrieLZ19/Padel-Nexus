import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-24 validacion de token en sesion BFF", () => {
  it("POST /api/auth/session valida token contra upstream antes de cookies", () => {
    const route = readFileSync(
      path.join(RAIZ, "app/api/auth/session/route.ts"),
      "utf8",
    );
    assert.match(route, /validateSessionToken/);
    assert.match(route, /401/);
    assert.match(route, /verified\.role/);
    assert.doesNotMatch(
      route,
      /body\.role[\s\S]*response\.cookies\.set\(\s*["']padel_user_role/,
    );
  });

  it("validateSessionToken consulta GET /perfil/me con Bearer", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/bff/validateSessionToken.ts"),
      "utf8",
    );
    assert.match(util, /\/perfil\/me/);
    assert.match(util, /Authorization/);
    assert.match(util, /getApiUpstreamUrl/);
  });
});