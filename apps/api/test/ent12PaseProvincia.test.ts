import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { asociacionOrigenIdDesdeAfiliaciones } from "../src/utils/afiliacionOrigenPase.ts";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_WEB = path.resolve(RAIZ_API, "../web");

function fuenteApi(subpath: string): string {
  return readFileSync(path.join(RAIZ_API, subpath), "utf8");
}

function fuenteWeb(subpath: string): string {
  return readFileSync(path.join(RAIZ_WEB, subpath), "utf8");
}

describe("ENT-12 pase de provincia (jugador)", () => {
  it("origen del pase prioriza afiliación provincial sobre club", () => {
    const id = asociacionOrigenIdDesdeAfiliaciones([
      { asociacion_id: "club-asoc", club_id: "c1" },
      { asociacion_id: "prov-asoc", club_id: null },
    ]);
    assert.equal(id, "prov-asoc");
  });

  it("API solicitar usa asociacionOrigenIdDesdeAfiliaciones", () => {
    const svc = fuenteApi("src/services/paseRepresentacion.service.ts");
    assert.match(svc, /asociacionOrigenIdDesdeAfiliaciones/);
    assert.match(svc, /club_id/);
  });

  it("mi-perfil lista pases y muestra cancelación", () => {
    const page = fuenteWeb("app/(public)/mi-perfil/page.tsx");
    assert.match(page, /PasesService\.listarMios/);
    assert.match(page, /PaseProvinciaPendiente/);
  });

  it("AfiliacionModal muestra nombre de asociación, no entidad de club", () => {
    const modal = fuenteWeb("components/perfil/AfiliacionModal.tsx");
    assert.match(modal, /etiquetaAsociacionOrigen/);
    assert.equal(
      modal.includes("origen?.entidad"),
      false,
      "no debe usar entidad del club como origen",
    );
  });
});
