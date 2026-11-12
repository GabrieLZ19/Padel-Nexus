import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { periodoDesdeFecha } from "../src/utils/licenciaConfig.ts";
import { provinciaParaRanking } from "../src/utils/provinciaRanking.ts";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_WEB = path.resolve(RAIZ_API, "../web");

function fuenteApi(sub: string): string {
  return readFileSync(path.join(RAIZ_API, sub), "utf8");
}

function fuenteWeb(sub: string): string {
  return readFileSync(path.join(RAIZ_WEB, sub), "utf8");
}

describe("ENT-14 textos y datos menores", () => {
  it("periodo anual usa YYYY", () => {
    assert.equal(periodoDesdeFecha(new Date("2026-11-06"), "anual"), "2026");
    assert.match(periodoDesdeFecha(new Date("2026-11-06"), "mensual"), /^2026-\d{2}$/);
  });

  it("resuelve sigla de asociación a provincia en ranking", () => {
    const map = new Map([["APN", "Neuquén"]]);
    assert.equal(provinciaParaRanking("APN", map), "Neuquén");
  });

  it("licencia: club opcional y copy sin FAP fija", () => {
    const modal = fuenteWeb("components/perfil/LicenciaModal.tsx");
    assert.match(modal, /siglaRectora/);
    assert.match(modal, /referencia \(opcional\)/);
    assert.equal(modal.includes("ante la FAP"), false);
    assert.equal(modal.includes("licencia oficial FAP"), false);
    const ctrl = fuenteApi("src/controllers/licencia.controller.ts");
    assert.match(ctrl, /club_id: club_id \|\| null/);
  });

  it("detalle federación usa sigla en título de carnets", () => {
    const det = fuenteWeb("app/dashboard/federaciones/[id]/page.tsx");
    assert.doesNotMatch(det, /carnets \(FAP\)/);
    assert.match(det, /federacion\.sigla/);
  });

  it("federación ve menú Clubes y superadmin no hereda tienda FAP por defecto", () => {
    const menu = fuenteWeb("utils/constants/menuPermissions.ts");
    assert.match(menu, /admin_federacion:[\s\S]*"\/dashboard\/clubes"/);
    const mkt = fuenteWeb("components/marketplace/MarketplaceCrmPanel.tsx");
    assert.match(mkt, /superadmin.*setEntidadId\(""\)/s);
  });

  it("tablero enriquece sede desde torneo_sedes", () => {
    const svc = fuenteApi("src/services/torneo.service.ts");
    assert.match(svc, /enriquecerSedesTablero/);
  });
});
