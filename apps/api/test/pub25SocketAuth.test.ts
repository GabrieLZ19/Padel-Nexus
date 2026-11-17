import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-25 Socket.io autenticado", () => {
  it("middleware valida token y fija socket.data.usuarioId", () => {
    const service = readFileSync(
      path.join(RAIZ, "src/services/socket.service.ts"),
      "utf8",
    );
    assert.match(service, /io\.use/);
    assert.match(service, /socket\.data\.usuarioId/);
    assert.match(service, /verificarUsuarioDesdeToken/);
    assert.match(service, /usuarioIdVerificadoSocket/);
  });

  it("join_room no usa el usuarioId enviado por el cliente", () => {
    const service = readFileSync(
      path.join(RAIZ, "src/services/socket.service.ts"),
      "utf8",
    );
    assert.match(service, /join_room", \(\) =>/);
    assert.doesNotMatch(service, /join_room", \(usuarioId: string\)/);
  });

  it("socketAuth extrae token de auth, Bearer o cookie", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/socketAuth.ts"),
      "utf8",
    );
    assert.match(util, /handshake\.auth/);
    assert.match(util, /padel_token/);
    assert.match(util, /supabase\.auth\.getUser/);
  });
});