import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-14 visitante sin sesión", () => {
  it("fetchProfile no llama API sin cookie de sesión", () => {
    const store = readFileSync(path.join(RAIZ, "store/useProfileStore.ts"), "utf8");
    assert.match(store, /tieneSesionCliente\(\)/);
    assert.match(store, /if \(!tieneSesionCliente\(\)\)/);
  });

  it("getMe corta antes de /perfil/me", () => {
    const perfil = readFileSync(
      path.join(RAIZ, "utils/services/perfil.ts"),
      "utf8",
    );
    assert.match(perfil, /if \(!tieneSesionCliente\(\)\)/);
    assert.match(perfil, /return null/);
  });

  it("favoritos y no-leídos no disparan HTTP sin sesión", () => {
    const marketplace = readFileSync(
      path.join(RAIZ, "utils/services/marketplace.ts"),
      "utf8",
    );
    const chat = readFileSync(path.join(RAIZ, "utils/services/chat.ts"), "utf8");
    assert.match(marketplace, /getFavoritos[\s\S]*?tieneSesionCliente\(\)/);
    assert.match(marketplace, /checkFavorito[\s\S]*?tieneSesionCliente\(\)/);
    assert.match(chat, /getNoLeidos[\s\S]*?tieneSesionCliente\(\)/);
  });

  it("chat flotante no consulta no-leídos sin sesión", () => {
    const soporte = readFileSync(
      path.join(RAIZ, "components/soporte/SoporteChat.tsx"),
      "utf8",
    );
    assert.match(soporte, /tieneSesionCliente\(\)/);
    assert.match(soporte, /setNoLeidos\(0\)/);
  });
});
