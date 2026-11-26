import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { motivoExclusionRankingTorneo } from "../src/utils/datoPrueba.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-56 es_prueba explícito y aviso en cierre", () => {
  it("motivoExclusionRanking prioriza la bandera es_prueba", () => {
    assert.equal(
      motivoExclusionRankingTorneo({
        nombre: "Open Oficial",
        es_prueba: true,
      }),
      "marcado como torneo de prueba (es_prueba)",
    );
    assert.equal(
      motivoExclusionRankingTorneo({
        nombre: "AUDITORIA UX - borrador de prueba",
        es_prueba: false,
      }),
      "nombre de ensayo o QA detectado",
    );
    assert.equal(
      motivoExclusionRankingTorneo({ nombre: "Masters", es_prueba: false }),
      null,
    );
  });

  it("Paso7Cierre muestra aviso transparente de exclusión", () => {
    const cierre = readFileSync(
      path.join(RAIZ, "../web/components/torneos/wizard/Paso7Cierre.tsx"),
      "utf8",
    );
    assert.match(cierre, /motivoExclusionRankingTorneoUi/);
    assert.match(cierre, /Torneo excluido del ranking oficial/);
    assert.match(cierre, /torneo de prueba/);
  });
});