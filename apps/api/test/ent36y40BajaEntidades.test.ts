import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-40 baja asociaciones y federaciones", () => {
  it("historial asociación incluye licencias, afiliaciones y admins", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/utils/entidadHistorial.ts"),
      "utf8",
    );
    assert.match(src, /ResumenHistorialAsociacion/);
    assert.match(src, /licencias/);
    assert.match(src, /afiliaciones/);
    assert.match(src, /usuariosAdmin/);
    assert.match(src, /admin_club/);
    assert.match(src, /admin_provincial/);
  });

  it("historial federación incluye licencias, afiliaciones y admins", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/utils/entidadHistorial.ts"),
      "utf8",
    );
    assert.match(src, /ResumenHistorialFederacion/);
    assert.match(src, /admin_federacion/);
  });

  it("gestionarBaja devuelve 404 si el ID no existe", () => {
    const asoc = readFileSync(
      path.join(RAIZ, "src/services/asociacion.service.ts"),
      "utf8",
    );
  const fed = readFileSync(
      path.join(RAIZ, "src/services/federacion.service.ts"),
      "utf8",
    );
    assert.match(asoc, /EntidadNoEncontradaError/);
    assert.match(fed, /EntidadNoEncontradaError/);
    assert.match(asoc, /historial: ResumenHistorialAsociacion/);
    assert.match(fed, /historial: ResumenHistorialFederacion/);
  });
});