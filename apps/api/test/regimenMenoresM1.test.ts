import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeFechaNacimiento } from "../src/utils/perfilPatch";

function leerArchivo(subpath: string): string {
  const p1 = path.resolve(subpath);
  if (fs.existsSync(p1)) return fs.readFileSync(p1, "utf8");
  const p2 = path.resolve("apps/api", subpath);
  if (fs.existsSync(p2)) return fs.readFileSync(p2, "utf8");
  const p3 = path.resolve(subpath.replace(/^apps\/api\//, ""));
  if (fs.existsSync(p3)) return fs.readFileSync(p3, "utf8");
  throw new Error(`No se encontró el archivo: ${subpath}`);
}

describe("M1 - Régimen de menores y fiscales (Backend)", () => {
  it("AuthService bloquea el login de un menor si está en PENDING_PARENTAL_CONSENT", () => {
    const authCode = leerArchivo("apps/api/src/services/auth.service.ts");
    assert.ok(
      authCode.includes('usuarioBase.cuenta_estado === "PENDING_PARENTAL_CONSENT"'),
      "Debe verificar el estado PENDING_PARENTAL_CONSENT en login",
    );
    assert.ok(
      authCode.includes("Tu cuenta está pendiente de consentimiento parental"),
      "Debe arrojar mensaje explicativo de bloqueo",
    );
  });

  it("PerfilService rechaza modificar la fecha de nacimiento oficial desde el perfil", () => {
    const perfilCode = leerArchivo("apps/api/src/services/perfil.service.ts");
    assert.ok(
      perfilCode.includes("perfilExistente?.fecha_nacimiento"),
      "Debe verificar la existencia de fecha_nacimiento oficial en perfil",
    );
    assert.ok(
      perfilCode.includes(
        "La fecha de nacimiento es un dato oficial y no puede modificarse desde el perfil",
      ),
      "Debe rechazar la alteración directa de fecha_nacimiento",
    );
  });

  it("PerfilService permite solicitar cambio de fecha_nacimiento a la entidad federativa", () => {
    const perfilCode = leerArchivo("apps/api/src/services/perfil.service.ts");
    assert.ok(
      perfilCode.includes('campo !== "fecha_nacimiento"'),
      "Debe admitir fecha_nacimiento como campo solicitado",
    );
    assert.ok(
      perfilCode.includes('campo === "fecha_nacimiento"'),
      "Debe normalizar y validar el formato AAAA-MM-DD para la fecha pedida",
    );
  });

  it("MenoresService contempla capa de comunicaciones comerciales en el consentimiento parental", () => {
    const menoresCode = leerArchivo("apps/api/src/services/menores.service.ts");
    assert.ok(
      menoresCode.includes("autoriza_comunicaciones_comerciales?: boolean"),
      "Interface ConfirmarConsentimientoInput debe incluir autoriza_comunicaciones_comerciales",
    );
    assert.ok(
      menoresCode.includes("autorizaComercial ? \"GRANTED\" : \"DENIED\""),
      "Debe registrar el evento MARKETING como GRANTED o DENIED según la autorización",
    );
    assert.ok(
      menoresCode.includes("marketing: autorizaComercial"),
      "Debe sincronizar marketing en privacidad_ajustes y perfiles",
    );
  });

  it("normalizeFechaNacimiento normaliza fechas ISO y formatos de input", () => {
    assert.equal(normalizeFechaNacimiento("2012-01-01"), "2012-01-01");
    assert.equal(normalizeFechaNacimiento("1990-05-15T00:00:00.000Z"), "1990-05-15");
    assert.equal(normalizeFechaNacimiento(""), undefined);
    assert.equal(normalizeFechaNacimiento(null), undefined);
  });
});
