import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  emailTieneVerificacion,
  cuentaPendienteActivacionApp,
} from "../src/utils/preinscripcionVerificacion.ts";
import { esPerfilFusionadoArchivado } from "../src/utils/fusionFichasJugador.ts";
import { ErrorColisionInscripcionesFusion } from "../src/utils/validarColisionInscripcionesFusionFichas.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-46/47/48 unir fichas", () => {
  it("ENT-46 sincroniza nombres en inscripciones y audita el conteo", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("unirFichasPorSuperadmin"),
      svc.indexOf("static async actualizarFichaProvisoriaAdmin"),
    );
    assert.match(bloque, /sincronizarNombresInscripcionesJugador/);
    assert.match(bloque, /inscripciones_nombres_actualizadas/);
    assert.match(bloque, /sincronizacion_nombres/);
  });

  it("ENT-47 valida colisión de inscripciones antes de fusionar", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("unirFichasPorSuperadmin"),
      svc.indexOf("await fusionarFichasJugador"),
    );
    assert.match(bloque, /assertSinColisionInscripcionesFusionFichas/);

    const util = readFileSync(
      path.join(RAIZ, "src/utils/validarColisionInscripcionesFusionFichas.ts"),
      "utf8",
    );
    assert.match(util, /FAP_ESTADOS_TORNEO\.FINALIZADO/);
    assert.match(util, /ErrorColisionInscripcionesFusion/);
    assert.equal(new ErrorColisionInscripcionesFusion([]).statusCode, 400);
  });

  it("ENT-48 migración RPC transfiere credenciales auth", () => {
    const sql = readFileSync(
      path.join(
        RAIZ,
        "../../supabase/migrations/20261127140000_ent48_transferir_auth_fusion.sql",
      ),
      "utf8",
    );
    assert.match(sql, /transferir_credenciales_auth_fusion/);
    assert.match(sql, /security definer/i);
    assert.match(sql, /grant execute[\s\S]*service_role/i);
    assert.match(sql, /auth\.identities/);
  });

  it("ENT-48 preserva acceso real en destino provisional y archiva origen", () => {
    const fusion = readFileSync(
      path.join(RAIZ, "src/utils/fusionFichasJugador.ts"),
      "utf8",
    );
    assert.match(fusion, /preservarAccesoOrigenEnDestino/);
    assert.match(fusion, /acceso_preservado_desde_origen/);
    assert.match(fusion, /emailTieneVerificacion/);
    assert.match(fusion, /cuentaPendienteActivacionApp/);
    assert.match(fusion, /transferir_credenciales_auth_fusion/);
    assert.doesNotMatch(fusion, /console\.warn/);
    assert.match(fusion, /auth\.admin\.deleteUser\(origenId\)/);
    assert.match(fusion, /Fusionado/);
    assert.match(fusion, /padelnexus\.local/);

    assert.equal(
      esPerfilFusionadoArchivado({ nombre: "Fusionado", apellido: "archivado" }),
      true,
    );
    assert.equal(
      debePreservarAcceso(
        { email: "jugador@mail.com", pendiente_activacion: false },
        {
          email: "preinscripto+1@padelnexus.local",
          pendiente_activacion: true,
        },
      ),
      true,
    );
  });

  it("CRM excluye fichas fusionadas archivadas", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/crm-contactos.service.ts"),
      "utf8",
    );
    assert.match(svc, /neq\("apellido", "archivado"\)/);
  });
});

function debePreservarAcceso(
  origen: { email?: string | null; pendiente_activacion?: boolean | null },
  destino: { email?: string | null; pendiente_activacion?: boolean | null },
): boolean {
  return (
    emailTieneVerificacion(origen.email) && cuentaPendienteActivacionApp(destino)
  );
}