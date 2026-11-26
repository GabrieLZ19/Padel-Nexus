import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  activacionPadronFapDisponible,
  cuentaPendienteActivacionApp,
} from "../src/utils/preinscripcionVerificacion.ts";

const raizApi = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function leer(rel: string): string {
  return readFileSync(path.join(raizApi, rel), "utf8");
}

describe("ENT-44: ficha de planilla y contacto del club", () => {
  it("cuenta pendiente con flag o email placeholder de planilla", () => {
    assert.equal(
      cuentaPendienteActivacionApp({
        pendiente_activacion: true,
        email: "jugador@test.com",
      }),
      true,
    );
    assert.equal(
      cuentaPendienteActivacionApp({
        pendiente_activacion: false,
        email: "preinscripto+30123456@padelnexus.local",
      }),
      true,
    );
    assert.equal(
      cuentaPendienteActivacionApp({
        pendiente_activacion: false,
        email: "jugador@test.com",
      }),
      false,
    );
  });

  it("planilla crea fichas con pendiente_activacion true", () => {
    const svc = leer("src/services/perfil.service.ts");
    assert.match(svc, /pendiente_activacion: true/);
    assert.doesNotMatch(
      svc,
      /if \(existente\.pendiente_activacion\) patch\.pendiente_activacion = false/,
    );
  });

  it("editar ficha provisoria mantiene pendiente_activacion y permite legacy", () => {
    const svc = leer("src/services/perfil.service.ts");
    assert.match(svc, /patch\.pendiente_activacion = true/);
    assert.match(svc, /puedeEditarFichaProvisoriaAdmin/);
    assert.match(svc, /esFichaPlanillaSinActivar/);
  });

  it("padrón FAP no se ofrece sin licencia", () => {
    const ficha = { telefono: "", email: "preinscripto+1@padelnexus.local" };
    assert.equal(activacionPadronFapDisponible(ficha), false);
    assert.equal(
      activacionPadronFapDisponible(ficha, { tiene_licencia_fap: true }),
      true,
    );
  });

  it("consulta preinscripción valida licencia antes de padron_fap_disponible", () => {
    const svc = leer("src/services/perfil.service.ts");
    assert.match(svc, /obtenerNroLicenciaPerfil/);
    assert.match(svc, /tiene_licencia_fap/);
  });
});