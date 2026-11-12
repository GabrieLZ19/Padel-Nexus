import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  coincideEmailPreinscripcion,
  coincideUltimos4Telefono,
  metodosVerificacionPreinscripcion,
} from "../src/utils/preinscripcionVerificacion.ts";

describe("PUB-18: preinscripción sin filtrar PII", () => {
  it("arma métodos de verificación según teléfono y email real", () => {
    assert.deepEqual(
      metodosVerificacionPreinscripcion({
        telefono: "+54 9 351 555-1234",
        email: "preinscripto+99@padelnexus.local",
      }),
      ["telefono"],
    );
    assert.deepEqual(
      metodosVerificacionPreinscripcion({
        telefono: "",
        email: "jugador@club.com",
      }),
      ["email"],
    );
    assert.deepEqual(
      metodosVerificacionPreinscripcion({
        telefono: "3515551234",
        email: "jugador@club.com",
      }),
      ["telefono", "email"],
    );
  });

  it("valida últimos 4 del teléfono ignorando formato", () => {
    assert.equal(
      coincideUltimos4Telefono("+54 9 351-555-7890", "7890"),
      true,
    );
    assert.equal(coincideUltimos4Telefono("3515557890", "1234"), false);
    assert.equal(coincideUltimos4Telefono("12", "1234"), false);
  });

  it("valida email real de la ficha", () => {
    assert.equal(
      coincideEmailPreinscripcion("Jugador@Club.COM", "jugador@club.com"),
      true,
    );
    assert.equal(
      coincideEmailPreinscripcion(
        "preinscripto+1@padelnexus.local",
        "preinscripto+1@padelnexus.local",
      ),
      false,
    );
  });

  it("GET consulta no devuelve perfil en el servicio", () => {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const fuente = readFileSync(
      path.join(raiz, "src/services/perfil.service.ts"),
      "utf8",
    );
    const bloqueConsulta = fuente.slice(
      fuente.indexOf("consultarPreinscripcionPorDni"),
      fuente.indexOf("verificarYObtenerPreinscripcionPorDni"),
    );
    assert.doesNotMatch(bloqueConsulta, /perfil:/);
    assert.match(fuente, /verificacion_requerida/);
    assert.match(fuente, /metodos_disponibles/);
  });

  it("rutas de preinscripción tienen rate limit", () => {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const fuente = readFileSync(
      path.join(raiz, "src/routes/perfil.routes.ts"),
      "utf8",
    );
    assert.match(fuente, /rateLimitPreinscripcion/);
    assert.match(fuente, /preinscripcion\/:dni\/verificar/);
  });
});
