import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { motivoExclusionRankingTorneoUi } from "../utils/datoPruebaTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-56 aviso de torneo de prueba en cierre", () => {
  it("motivoExclusionRankingTorneoUi alinea con backend", () => {
    assert.equal(
      motivoExclusionRankingTorneoUi({ nombre: "Open", es_prueba: true }),
      "marcado como torneo de prueba (es_prueba)",
    );
    assert.equal(
      motivoExclusionRankingTorneoUi({
        nombre: "QA ensayo",
        es_prueba: false,
      }),
      "nombre de ensayo o QA detectado",
    );
  });

  it("Paso7Cierre renderiza bloque de exclusión", () => {
    const src = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso7Cierre.tsx"),
      "utf8",
    );
    assert.match(src, /motivoTorneoPrueba/);
    assert.match(src, /Torneo excluido del ranking oficial/);
  });
});