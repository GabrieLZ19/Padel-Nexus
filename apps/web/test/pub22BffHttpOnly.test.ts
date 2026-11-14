import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-22 BFF HttpOnly y proxy", () => {
  it("route de sesion fija cookie HttpOnly y expone DELETE", () => {
    const route = readFileSync(
      path.join(RAIZ, "app/api/auth/session/route.ts"),
      "utf8",
    );
    assert.match(route, /sessionCookieOptions/);
    const cookieOpts = readFileSync(
      path.join(RAIZ, "utils/bff/cookieOptions.ts"),
      "utf8",
    );
    assert.match(cookieOpts, /httpOnly:\s*true/);
    assert.match(route, /export async function DELETE/);
  });

  it("proxy reenvia Authorization desde cookie del servidor", () => {
    const proxy = readFileSync(
      path.join(RAIZ, "utils/bff/proxyForward.ts"),
      "utf8",
    );
    assert.match(proxy, /Authorization/);
    assert.match(proxy, /padel_token/);
    assert.match(proxy, /content-encoding/);
    assert.match(proxy, /accept-encoding/);
    assert.match(
      readFileSync(path.join(RAIZ, "app/api/proxy/[...path]/route.ts"), "utf8"),
      /forwardToApiUpstream/,
    );
  });

  it("cliente axios usa /api/proxy y login delega sesion al BFF", () => {
    const api = readFileSync(path.join(RAIZ, "utils/api.ts"), "utf8");
    const login = readFileSync(
      path.join(RAIZ, "app/(auth)/login/page.tsx"),
      "utf8",
    );
    const session = readFileSync(path.join(RAIZ, "utils/session.ts"), "utf8");
    assert.match(api, /\/api\/proxy/);
    assert.doesNotMatch(api, /getSessionToken/);
    assert.match(login, /establecerSesionCliente/);
    assert.doesNotMatch(login, /document\.cookie.*padel_token/);
    assert.match(session, /padel_user_role/);
  });
});
