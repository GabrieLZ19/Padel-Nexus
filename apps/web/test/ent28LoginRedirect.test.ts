import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  normalizarDestinoConSeccion,
  resolveDestinoTrasLogin,
} from "../utils/auth/postLoginRedirect.ts";

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

  it("convierte fragmento #notificaciones en ?seccion= para ajustes", () => {
    assert.equal(
      normalizarDestinoConSeccion("/mi-perfil/ajustes#notificaciones"),
      "/mi-perfil/ajustes?seccion=notificaciones",
    );
    assert.equal(
      resolveDestinoTrasLogin(
        "/mi-perfil/ajustes",
        "notificaciones",
        "/",
      ),
      "/mi-perfil/ajustes?seccion=notificaciones",
    );
    assert.equal(
      resolveDestinoTrasLogin(
        "/mi-perfil/ajustes?seccion=notificaciones",
        null,
        "/",
      ),
      "/mi-perfil/ajustes?seccion=notificaciones",
    );
  });

  it("ajustes acepta seccion=notificaciones en query", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/ajustes/page.tsx"),
      "utf8",
    );
    assert.match(page, /SECCION_AJUSTES_NOTIFICACIONES/);
    assert.match(page, /searchParams\.get\("seccion"\)/);
  });
});
