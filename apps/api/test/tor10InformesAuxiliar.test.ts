import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  debeFiltrarIncidenciasPorEmisor,
  filtrarIncidenciasVisiblesPorFiscal,
} from "../src/utils/fiscalIncidenciasVisibilidad.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(subpath: string): string {
  return readFileSync(path.join(RAIZ, subpath), "utf8");
}

const INC = [
  {
    id: "1",
    torneo_id: "t1",
    fiscal_id: "f-aux",
    tipo: "informe_preliminar",
  },
  {
    id: "2",
    torneo_id: "t1",
    fiscal_id: "f-otro",
    tipo: "informe_preliminar",
  },
  {
    id: "3",
    torneo_id: "t2",
    fiscal_id: "f-otro",
    tipo: "informe_preliminar",
  },
];

describe("TOR-10 auxiliar no ve informes de otros fiscales", () => {
  it("debeFiltrarIncidenciasPorEmisor: solo el fiscal general ve todos", () => {
    assert.equal(debeFiltrarIncidenciasPorEmisor("auxiliar"), true);
    assert.equal(debeFiltrarIncidenciasPorEmisor("general"), false);
    assert.equal(debeFiltrarIncidenciasPorEmisor(undefined), true);
  });

  it("auxiliar en t1 solo ve sus propios informes en ese torneo", () => {
    const visible = filtrarIncidenciasVisiblesPorFiscal(INC, "f-aux", [
      { torneo_id: "t1", rol: "auxiliar" },
      { torneo_id: "t2", rol: "auxiliar" },
    ]);
    assert.deepEqual(visible.map((i) => i.id), ["1"]);
  });

  it("fiscal general en t1 ve todos los informes de t1", () => {
    const visible = filtrarIncidenciasVisiblesPorFiscal(INC, "f-gen", [
      { torneo_id: "t1", rol: "general" },
    ]);
    assert.deepEqual(visible.map((i) => i.id).sort(), ["1", "2"]);
  });

  it("general en un torneo y auxiliar en otro: mezcla por torneo", () => {
    const visible = filtrarIncidenciasVisiblesPorFiscal(INC, "f-mix", [
      { torneo_id: "t1", rol: "general" },
      { torneo_id: "t2", rol: "auxiliar" },
    ]);
    assert.deepEqual(visible.map((i) => i.id).sort(), ["1", "2"]);
  });

  it("listarIncidencias filtra por fiscal_id salvo rol general", () => {
    const code = fuente("src/services/fiscal-panel.service.ts");
    assert.match(code, /rolTorneo !== "general"/);
    assert.match(code, /\.eq\("fiscal_id", opts\.fiscalId\)/);
  });

  it("getIncidencias pasa rol de torneo y fiscal al servicio", () => {
    const code = fuente("src/controllers/fiscal-panel.controller.ts");
    assert.match(code, /listarIncidencias\(req\.params\.id,\s*\{/);
    assert.match(code, /rolTorneo: req\.fiscalRolTorneo/);
  });
});
