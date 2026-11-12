import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRecuperacionRedirectUrl,
  esErrorRedirectRecuperacion,
  esErrorUsuarioInexistenteRecuperacion,
  mensajeErrorSupabaseAuth,
} from "../src/utils/authError.ts";

describe("PUB-1: recuperación de contraseña", () => {
  it("arma redirectTo hacia /update-password sin barra final duplicada", () => {
    assert.equal(
      buildRecuperacionRedirectUrl("https://padelnexus.netlify.app/"),
      "https://padelnexus.netlify.app/update-password",
    );
    assert.equal(
      buildRecuperacionRedirectUrl("http://localhost:3000"),
      "http://localhost:3000/update-password",
    );
  });

  it("detecta redirect no permitido y usuario inexistente", () => {
    assert.equal(
      esErrorRedirectRecuperacion({
        message: "redirect_to url is not allowed",
        name: "AuthApiError",
        status: 400,
      } as never),
      true,
    );
    assert.equal(
      esErrorUsuarioInexistenteRecuperacion({
        message: "User not found",
        name: "AuthApiError",
        status: 404,
      } as never),
      true,
    );
  });

  it("auth.service define fallback generateLink y Resend", () => {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const fuente = readFileSync(
      path.join(raiz, "src/services/auth.service.ts"),
      "utf8",
    );
    assert.match(fuente, /generateLink/);
    assert.match(fuente, /enviarCorreoRecuperacionResend/);
  });

  it("no devuelve mensajes vacíos ni {}", () => {
    assert.equal(
      mensajeErrorSupabaseAuth(
        { message: "{}", name: "AuthApiError", status: 500 } as never,
        "Fallback claro",
      ),
      "Fallback claro",
    );
    assert.equal(
      mensajeErrorSupabaseAuth(
        { message: "Email rate limit exceeded", name: "AuthApiError", status: 429 } as never,
        "Fallback",
      ),
      "Email rate limit exceeded",
    );
  });
});
