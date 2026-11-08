import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRecuperacionRedirectUrl,
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
