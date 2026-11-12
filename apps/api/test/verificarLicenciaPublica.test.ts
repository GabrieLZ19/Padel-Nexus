import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enmascararDni } from "../src/utils/enmascararDni.ts";
import {
  normalizarEstadoAlmacenadoLicencia,
  resolverEstadoLicenciaPublica,
} from "../src/utils/estadoLicencia.ts";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-1: verificación pública de carné", () => {
  it("enmascara el DNI dejando solo los últimos 4 dígitos", () => {
    assert.equal(enmascararDni("22377800"), "•••• 7800");
    assert.equal(enmascararDni("12.345.678"), "•••• 5678");
    assert.equal(enmascararDni(""), null);
    assert.equal(enmascararDni(null), null);
  });

  it("normaliza estados en distintas mayúsculas", () => {
    assert.equal(normalizarEstadoAlmacenadoLicencia("ACTIVA"), "Activa");
    assert.equal(normalizarEstadoAlmacenadoLicencia("activa"), "Activa");
    assert.equal(normalizarEstadoAlmacenadoLicencia("Activa"), "Activa");
  });

  it("marca vigente una licencia Activa con vencimiento futuro", () => {
    const res = resolverEstadoLicenciaPublica(
      "Activa",
      "2026-12-31",
      new Date("2026-11-12T15:00:00Z"),
    );
    assert.equal(res.valida, true);
    assert.equal(res.estado, "activa");
  });

  it("rechaza licencia suspendida o pendiente", () => {
    assert.deepEqual(resolverEstadoLicenciaPublica("Suspendida", "2026-12-31"), {
      estado: "suspendida",
      valida: false,
    });
    assert.deepEqual(resolverEstadoLicenciaPublica("Pendiente", "2026-12-31"), {
      estado: "no_valida",
      valida: false,
    });
  });

  it("verificarPublica usa el embed fk_licencias_usuario y fallback sin embed", () => {
    const fuente = readFileSync(
      path.join(RAIZ_API, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(fuente, /perfiles!fk_licencias_usuario\(nombre, apellido, dni\)/);
    assert.match(fuente, /obtenerLicenciaParaVerificacionPublica/);
    assert.match(fuente, /\.from\("perfiles"\)/);
  });
});
