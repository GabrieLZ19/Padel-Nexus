import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  activacionPadronFapDisponible,
  metodosVerificacionPreinscripcion,
} from "../src/utils/preinscripcionVerificacion.ts";
import {
  coincideFechaNacimientoPadron,
  coincidenLicenciasPadron,
  emailValidoPadronOtp,
  generarCodigoOtpPadron,
  hashCodigoOtpPadron,
  normalizarNroLicenciaPadron,
  telefonoValidoPadronOtp,
} from "../src/utils/preinscripcionPadronFap.ts";

const raizApi = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function leer(rel: string): string {
  return readFileSync(path.join(raizApi, rel), "utf8");
}

describe("ENT-35: activación padrón FAP sin contacto previo", () => {
  it("habilita padron_fap solo sin métodos teléfono/email", () => {
    const sinContacto = { telefono: "", email: "pre@padelnexus.local" };
    assert.deepEqual(metodosVerificacionPreinscripcion(sinContacto), []);
    assert.equal(activacionPadronFapDisponible(sinContacto), true);
    assert.equal(
      activacionPadronFapDisponible({
        telefono: "3515551234",
        email: "pre@padelnexus.local",
      }),
      false,
    );
  });

  it("valida fecha, licencia, email y teléfono del flujo padron", () => {
    assert.equal(
      coincideFechaNacimientoPadron("1990-05-15", "1990-05-15T00:00:00.000Z"),
      true,
    );
    assert.equal(coincidenLicenciasPadron(" pad-001 ", "PAD-001"), true);
    assert.equal(normalizarNroLicenciaPadron("abc 12"), "ABC12");
    assert.equal(emailValidoPadronOtp("a@b.com"), true);
    assert.equal(telefonoValidoPadronOtp("351 555 1234"), true);
    const codigo = generarCodigoOtpPadron();
    assert.match(codigo, /^\d{6}$/);
    assert.equal(hashCodigoOtpPadron(codigo).length, 64);
  });

  it("bloqueo por fuerza bruta reutiliza preinscripcion_verificacion_bloqueos", () => {
    const bloqueo = leer("src/utils/preinscripcionBloqueo.ts");
    assert.match(bloqueo, /MAX_INTENTOS_FALLIDOS = 5/);
    assert.match(bloqueo, /registrarIntentoFallidoPreinscripcion/);
  });

  it("servicio expone padron_fap, OTP y ficha-provisoria con contacto", () => {
    const svc = leer("src/services/perfil.service.ts");
    assert.match(svc, /padron_fap_disponible/);
    assert.match(svc, /solicitarOtpActivacionPadronFap/);
    assert.match(svc, /confirmarOtpActivacionPadronFap/);
    assert.match(svc, /metodo: "padron_fap"/);
    assert.match(svc, /emailValidoPadronOtp/);
    assert.match(svc, /telefonoValidoPadronOtp/);
  });

  it("rutas públicas de padron_fap con rate limit", () => {
    const rutas = leer("src/routes/perfil.routes.ts");
    assert.match(rutas, /padron-fap\/solicitar-otp/);
    assert.match(rutas, /padron-fap\/confirmar-otp/);
    assert.match(rutas, /rateLimitPreinscripcion/);
  });

  it("registro acepta token padron sin métodos en ficha", () => {
    const auth = leer("src/services/auth.service.ts");
    assert.doesNotMatch(
      auth,
      /No podés activar esta ficha sin verificación\. Contactá a tu entidad/,
    );
    assert.match(auth, /padrón FAP/);
  });

  it("migración ent35 define OTP y método padron_fap en tokens", () => {
    const raiz = path.resolve(raizApi, "..", "..");
    const sql = readFileSync(
      path.join(
        raiz,
        "supabase/migrations/20261125210000_ent35_padron_fap_activacion.sql",
      ),
      "utf8",
    );
    assert.match(sql, /preinscripcion_padron_fap_otp/);
    assert.match(sql, /padron_fap/);
  });
});