import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPerfilUpdatePatch } from "../src/utils/perfilPatch.ts";
import { resolverIpClienteDesdeRequest } from "../src/middleware/rateLimit.ts";
import type { Request } from "express";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-19: activación de ficha solo con token de verificación", () => {
  it("buildPerfilUpdatePatch no borra teléfono con string vacío", () => {
    const patch = buildPerfilUpdatePatch({
      email: "a@b.com",
      telefono: "",
      nombre: "Ana",
    });
    assert.equal("telefono" in patch, false);
    assert.equal(patch.email, "a@b.com");
  });

  it("AuthService.registrar exige verification_token en activación de ficha", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/auth.service.ts"),
      "utf8",
    );
    assert.match(fuente, /consumirTokenActivacionPreinscripcion/);
    assert.match(fuente, /Debés verificar tu identidad/);
    assert.match(
      fuente,
      /No podés activar esta ficha sin verificación/,
    );
  });

  it("verificar preinscripción emite verification_token", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(fuente, /emitirTokenActivacionPreinscripcion/);
    assert.match(fuente, /verification_token/);
  });

  it("rate limit de preinscripción usa DNI además de IP", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/routes/perfil.routes.ts"),
      "utf8",
    );
    assert.match(fuente, /extraBucketKey/);
    assert.match(fuente, /rateLimitRegistro/);
  });

  it("resolver IP confiable usa último valor de X-Forwarded-For", () => {
    const req = {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as Request;
    assert.equal(resolverIpClienteDesdeRequest(req), "9.10.11.12");
  });
});
