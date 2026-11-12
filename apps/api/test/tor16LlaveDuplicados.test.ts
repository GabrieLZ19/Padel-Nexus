import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  limpiarSlot,
  reemplazarParejaEnLado,
  type PartidoEditable,
} from "../src/utils/edicionLlaveMenores.ts";
import { LlaveConflictoError } from "../src/utils/edicionLlaveDuplicados.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuenteApi(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("TOR-16 editar llave sin duplicar parejas", () => {
  it("limpiarSlot libera un lado pendiente sin borrar al rival", () => {
    const partido: PartidoEditable = {
      id: "m1",
      ronda: "OCTAVOS",
      orden: 1,
      equipoAId: "pareja-a",
      equipoBId: "pareja-b",
      ganador: null,
      set1A: null,
      set1B: null,
    };
    const parche = limpiarSlot(partido, "a");
    assert.equal(parche.equipoAId, null);
    assert.equal(parche.equipoBId, "pareja-b");
    assert.equal(parche.ganador, null);
    assert.equal(parche.estado, "Programado");
  });

  it("reemplazarParejaEnLado permite intercambio en slot pendiente", () => {
    const partido: PartidoEditable = {
      id: "m3",
      ronda: "OCTAVOS",
      orden: 2,
      equipoAId: "pareja-rival",
      equipoBId: "pareja-entrante",
      ganador: null,
      set1A: null,
      set1B: null,
    };
    const parche = reemplazarParejaEnLado(partido, "b", "pareja-desplazada");
    assert.equal(parche.equipoAId, "pareja-rival");
    assert.equal(parche.equipoBId, "pareja-desplazada");
    assert.equal(parche.estado, "Programado");
  });

  it("limpiarSlot rechaza mover pareja con resultado", () => {
    const partido: PartidoEditable = {
      id: "m2",
      ronda: "OCTAVOS",
      orden: 2,
      equipoAId: "a",
      equipoBId: "b",
      ganador: "a",
      set1A: 6,
      set1B: 2,
    };
    assert.throws(() => limpiarSlot(partido, "a"), /ya jugó/);
  });

  it("actualizarEquiposPartido invoca liberar duplicados en llave", () => {
    const svc = fuenteApi("src/services/torneo.service.ts");
    const bloque = svc.slice(
      svc.indexOf("static async actualizarEquiposPartido"),
      svc.indexOf("static async gestionarParejaLlave"),
    );
    assert.match(bloque, /liberarParejasDuplicadasEnLlave/);
  });

  it("liberar duplicados intercambia parejas cuando hay desplazado", () => {
    const fuente = fuenteApi("src/utils/edicionLlaveDuplicados.ts");
    assert.match(fuente, /reemplazarParejaEnLado/);
    assert.match(fuente, /intercambiados/);
  });

  it("controlador devuelve 409 ante conflicto de llave", () => {
    const ctrl = fuenteApi("src/controllers/torneo.controller.ts");
    const bloque = ctrl.slice(
      ctrl.indexOf("export const actualizarEquiposPartido"),
      ctrl.indexOf("export const gestionarParejaLlave"),
    );
    assert.match(bloque, /statusCode === 409/);
  });

  it("LlaveConflictoError expone código 409", () => {
    const err = new LlaveConflictoError("Pareja bloqueada");
    assert.equal(err.statusCode, 409);
  });
});
