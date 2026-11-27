import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FAP_ESTADOS_PAGO } from "../src/constants/fap.ts";
import {
  actorEsJugadorPublico,
  jugadorNoPuedeAutoCancelarInscripcionPagada,
  assertPasoJugadoresEditable,
} from "../src/utils/inscripcionElegibilidad.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-21 baja de inscripción pagada y orden de anulación de fee", () => {
  it("anula fees solo después de validar torneo y pago del jugador", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async cancelarInscripcion"),
      svc.indexOf("static async registrarInscripcionManual"),
    );
    const idxAssert = bloque.indexOf("assertPasoJugadoresEditable");
    const idxBajaPagada = bloque.indexOf("jugadorNoPuedeAutoCancelarInscripcionPagada");
    const idxAnular = bloque.indexOf("anularFeesPorInscripcion");
    assert.ok(idxAssert >= 0 && idxBajaPagada > idxAssert);
    assert.ok(idxAnular > idxBajaPagada);
    assert.doesNotMatch(
      bloque.slice(0, idxAssert),
      /anularFeesPorInscripcion/,
    );
  });

  it("jugador público no puede auto-baja con pago confirmado en torneo con costo", () => {
    assert.equal(
      jugadorNoPuedeAutoCancelarInscripcionPagada(
        { estado_pago: FAP_ESTADOS_PAGO.CONFIRMADO, monto: 5000 },
        { es_gratis: false, precio_inscripcion: 5000 },
      ),
      true,
    );
    assert.equal(
      jugadorNoPuedeAutoCancelarInscripcionPagada(
        { estado_pago: FAP_ESTADOS_PAGO.PENDIENTE, monto: 5000 },
        { es_gratis: false, precio_inscripcion: 5000 },
      ),
      false,
    );
    assert.equal(
      jugadorNoPuedeAutoCancelarInscripcionPagada(
        { estado_pago: FAP_ESTADOS_PAGO.CONFIRMADO, monto: 0 },
        { es_gratis: true, precio_inscripcion: 0 },
      ),
      false,
    );
  });

  it("baja rechazada por torneo con cuadros ocurre antes de anular fee", () => {
    assert.throws(
      () => assertPasoJugadoresEditable({ estado: "Programado" }),
      /No se pueden inscribir ni borrar parejas/,
    );
  });

  it("actorEsJugadorPublico distingue rol usuario de organizadores", () => {
    assert.equal(
      actorEsJugadorPublico(
        { id: "j1", rol: "usuario" },
        { usuario_id: "j1", usuario2_id: "j2" },
      ),
      true,
    );
    assert.equal(
      actorEsJugadorPublico(
        { id: "j1", rol: "admin" },
        { usuario_id: "j1", usuario2_id: "j2" },
      ),
      false,
    );
  });

  it("DELETE responde 403/409 según motivo de rechazo", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/inscripcion.controller.ts"),
      "utf8",
    );
    const bloque = ctrl.slice(
      ctrl.indexOf("export const deleteInscripcion"),
      ctrl.indexOf("export const createInscripcionManual"),
    );
    assert.match(bloque, /gestionar el reintegro/);
    assert.match(bloque, /No se pueden inscribir ni borrar/);
    assert.match(bloque, /409/);
  });
});