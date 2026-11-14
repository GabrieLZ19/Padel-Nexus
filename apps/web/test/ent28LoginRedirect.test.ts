import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-28 redirect tras login", () => {
  it("util expone helpers de redirect seguro y fragmento", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/auth/postLoginRedirect.ts"),
      "utf8",
    );
    assert.match(util, /safeRedirectPath/);
    assert.match(util, /safeRedirectFragment/);
    assert.match(util, /resolveDestinoTrasLogin/);
    assert.match(util, /applyRedirectFragment/);
    assert.match(util, /buildMiddlewareLoginRedirect/);
    assert.match(util, /guardarRedirectPostLogin/);
    assert.match(util, /leerRedirectPostLogin/);
    assert.match(util, /pathPart\.startsWith\("\/login"\)/);
  });

  it("middleware propaga redirect en rutas privadas", () => {
    const middleware = readFileSync(
      path.join(RAIZ, "middleware.ts"),
      "utf8",
    );
    assert.match(middleware, /buildMiddlewareLoginRedirect/);
    assert.match(middleware, /loginUrl\.searchParams\.set/);
    assert.doesNotMatch(
      middleware,
      /if\s*\(\s*isMensajesRoute\s*\)\s*\{[\s\S]*loginUrl\.searchParams\.set/,
    );
  });

  it("login y callback resuelven redirect y fragment", () => {
    const login = readFileSync(
      path.join(RAIZ, "app/(auth)/login/page.tsx"),
      "utf8",
    );
    const callback = readFileSync(
      path.join(RAIZ, "app/(auth)/callback/page.tsx"),
      "utf8",
    );
    assert.match(login, /resolveDestinoTrasLogin/);
    assert.match(login, /safeRedirectFragment/);
    assert.match(login, /guardarRedirectPostLogin/);
    assert.match(callback, /leerRedirectPostLogin/);
    assert.match(callback, /resolveDestinoTrasLogin/);
  });
});
