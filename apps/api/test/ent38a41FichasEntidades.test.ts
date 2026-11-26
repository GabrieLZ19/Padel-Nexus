import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  jugadorEnAlcanceFederacion,
  jugadorEnAlcanceProvincial,
} from "../src/utils/alcanceCuenta.ts";
import { formatNombreInscripcionJugador } from "../src/utils/formatNombreInscripcion.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-38 alcance ficha provisoria", () => {
  it("provincial: permite residencia, club, licencia o asociación de la provincia", () => {
    const alcance = {
      provincia: "Neuquén",
      asociacionId: "asoc-neu",
    };
    assert.equal(
      jugadorEnAlcanceProvincial(
        { lugarResidencia: "Neuquén" },
        alcance,
      ),
      true,
    );
    assert.equal(
      jugadorEnAlcanceProvincial(
        { clubProvincia: "Neuquén" },
        alcance,
      ),
      true,
    );
    assert.equal(
      jugadorEnAlcanceProvincial(
        { licenciaProvinciaSolicitud: "Neuquen" },
        alcance,
      ),
      true,
    );
    assert.equal(
      jugadorEnAlcanceProvincial(
        { licenciaAsociacionId: "asoc-neu" },
        alcance,
      ),
      true,
    );
    assert.equal(
      jugadorEnAlcanceProvincial(
        {
          lugarResidencia: "Buenos Aires",
          licenciaAsociacionId: "asoc-ba",
        },
        alcance,
      ),
      false,
    );
  });

  it("federación: permite provincias y asociaciones del circuito", () => {
    const asociacionIds = new Set(["asoc-neu", "asoc-rn"]);
    const provincias = ["Neuquén", "Río Negro"];

    assert.equal(
      jugadorEnAlcanceFederacion(
        { clubProvincia: "Río Negro" },
        { asociacionIds, provincias },
      ),
      true,
    );
    assert.equal(
      jugadorEnAlcanceFederacion(
        { licenciaAsociacionId: "asoc-neu" },
        { asociacionIds, provincias },
      ),
      true,
    );
    assert.equal(
      jugadorEnAlcanceFederacion(
        { lugarResidencia: "Córdoba" },
        { asociacionIds, provincias },
      ),
      false,
    );
  });

  it("perfil.service y controller aplican exigirEdicionFichaProvisoria y 403", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(svc, /exigirEdicionFichaProvisoria/);

    const alcanceSvc = readFileSync(
      path.join(RAIZ, "src/services/alcanceCuenta.service.ts"),
      "utf8",
    );
    assert.match(alcanceSvc, /exigirEdicionFichaProvisoria/);
    assert.match(alcanceSvc, /admin_provincial/);
    assert.match(alcanceSvc, /admin_federacion/);

    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/perfil.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /statusCode/);
    assert.match(ctrl, /rol: req\.user\?\.rol/);
  });
});

describe("ENT-39 propagar nombre a inscripciones", () => {
  it("formato de etiqueta en inscripciones", () => {
    assert.equal(
      formatNombreInscripcionJugador("Pérez", "Juan"),
      "PÉREZ, Juan",
    );
    assert.equal(formatNombreInscripcionJugador("García", null), "GARCÍA");
  });

  it("perfil.service sincroniza inscripciones sin torneo finalizado", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/sincronizarNombresInscripcionesJugador.ts"),
      "utf8",
    );
    assert.match(util, /FAP_ESTADOS_TORNEO\.FINALIZADO/);
    assert.match(util, /jugador1_nombre/);
    assert.match(util, /jugador2_nombre/);

    const svc = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(svc, /sincronizarNombresInscripcionesJugador/);
    assert.match(
      svc,
      /actualizarDatosPerfil[\s\S]*sincronizarNombresInscripcionesJugador/,
    );
    assert.match(
      svc,
      /actualizarFichaProvisoriaPorAdmin[\s\S]*sincronizarNombresInscripcionesJugador/,
    );
  });
});

describe("ENT-41 corrección DNI y historial de ficha", () => {
  it("solo superadmin corrige DNI con auditoría y control de duplicados", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(svc, /corregirDniFichaPorSuperadmin/);
    assert.match(svc, /corregir_dni_ficha/);
    assert.match(svc, /ErrorDniFichaDuplicado/);
    assert.match(svc, /actor\.rol !== "superadmin"/);

    const errUtil = readFileSync(
      path.join(RAIZ, "src/utils/errorDniFicha.ts"),
      "utf8",
    );
    assert.match(errUtil, /statusCode = 409/);
  });

  it("expone rutas PATCH /dni y GET historial-ficha", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/perfil.routes.ts"),
      "utf8",
    );
    assert.match(routes, /\/:id\/dni/);
    assert.match(routes, /\/:id\/historial-ficha/);
    assert.match(routes, /authorize\(\["superadmin"\]\)/);
    assert.match(routes, /listarHistorialFicha/);
    assert.match(routes, /corregirDniFicha/);
  });

  it("historial lista correcciones de DNI y ficha provisoria", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(svc, /listarHistorialCorreccionesFicha/);
    assert.match(svc, /corregir_dni_ficha/);
    assert.match(svc, /editar_ficha_provisoria/);
  });
});