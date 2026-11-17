import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-25 Socket.io cliente", () => {
  it("BFF expone socket-token validando sesion", () => {
    const route = readFileSync(
      path.join(RAIZ, "app/api/auth/socket-token/route.ts"),
      "utf8",
    );
    assert.match(route, /padel_token/);
    assert.match(route, /validateSessionToken/);
  });

  it("useSocket obtiene token del BFF y auth en handshake", () => {
    const hook = readFileSync(path.join(RAIZ, "hooks/useSocket.ts"), "utf8");
    const sesion = readFileSync(
      path.join(RAIZ, "utils/auth/sesionBff.ts"),
      "utf8",
    );
    assert.match(sesion, /obtenerTokenSocketCliente/);
    assert.match(sesion, /\/api\/auth\/socket-token/);
    assert.match(hook, /obtenerTokenSocketCliente/);
    assert.match(hook, /auth:\s*\{\s*token/);
    assert.doesNotMatch(hook, /join_room", profile\.id/);
  });
});