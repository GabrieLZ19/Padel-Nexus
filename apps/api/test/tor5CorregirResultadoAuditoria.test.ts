import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  construirResumenCorreccionResultado,
  formatearMarcadorAuditoria,
  partidoYaTeniaResultado,
  referenciasEntidadTorneoEnAuditoria,
} from "../src/utils/auditoriaTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-5 corrección de resultado en auditoría", () => {
  it("detecta partido ya finalizado aunque falte ganador en el snapshot", () => {
    assert.equal(partidoYaTeniaResultado({ estado_partido: "Finalizado" }), true);
    assert.equal(
      partidoYaTeniaResultado({ set1_a: 6, set1_b: 4, ganador: null }),
      true,
    );
    assert.equal(partidoYaTeniaResultado({ ganador: null }), false);
  });

  it("referencias de entidad incluyen uuid y prefijos legacy", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    assert.deepEqual(referenciasEntidadTorneoEnAuditoria(id), [
      id,
      `torneo_id: ${id}`,
      `torneos_id: ${id}`,
    ]);
  });

  it("audita antes de actualizar el partido y falla si el insert no se persiste", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const idxAudit = svc.indexOf('accion: "corregir_resultado"');
    const idxUpdate = svc.indexOf('.from("partidos")\n      .update({', idxAudit);
    assert.ok(idxAudit > 0);
    assert.ok(idxUpdate > idxAudit);
    assert.match(svc, /No se pudo registrar la corrección en auditoría/);
  });

  it("getAuditoria delega en listarAuditoriaTorneo", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /listarAuditoriaTorneo/);
    const util = readFileSync(
      path.join(RAIZ, "src/utils/auditoriaTorneo.ts"),
      "utf8",
    );
    assert.match(util, /detalles->>torneo_id/);
    assert.match(util, /detalles->>partido_id/);
    assert.match(util, /ilike\("entidad_afectada"/);
  });

  it("corrección arma resumen legible para la pestaña Auditoría", () => {
    const resumen = construirResumenCorreccionResultado({
      numeroPartido: 17,
      ronda: "OCTAVOS",
      valorAnterior: { set1_a: 6, set1_b: 2, set2_a: 6, set2_b: 2 },
      valorNuevo: { set1_a: 6, set1_b: 4, set2_a: 6, set2_b: 4 },
    });
    assert.match(resumen, /Corrección de resultado/);
    assert.match(resumen, /Partido #17/);
    assert.match(resumen, /6-2, 6-2/);
    assert.match(resumen, /6-4, 6-4/);
    assert.equal(
      formatearMarcadorAuditoria({ set1_a: 0, set1_b: 0, es_wo: true }),
      "Walkover",
    );
  });

  it("insert de corregir_resultado incluye resumen y numero_partido", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf('accion: "corregir_resultado"'),
      svc.indexOf('accion: "corregir_resultado"') + 600,
    );
    assert.match(bloque, /numero_partido/);
    assert.match(bloque, /resumen/);
    assert.match(bloque, /resumen/);
    assert.match(svc, /construirResumenCorreccionResultado/);
  });
});
