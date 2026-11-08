import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const API_RAIZ = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const WEB_RAIZ = path.resolve(API_RAIZ, "../web");

function leer(relativo: string, base: string): string {
  return readFileSync(path.join(base, relativo), "utf8");
}

describe("ENT-11 licencias de clubes", () => {
  it("migración y servicio de licencias club", () => {
    const mig = readFileSync(
      path.resolve(
        API_RAIZ,
        "../../supabase/migrations/20261111120000_licencias_club.sql",
      ),
      "utf8",
    );
    assert.match(mig, /licencias_club/);
    assert.match(mig, /licencias_club_pagos/);
    const svc = leer("src/services/licenciaClub.service.ts", API_RAIZ);
    assert.match(svc, /asegurarLicenciaParaClub/);
    assert.match(svc, /registrarPago/);
    const rutas = leer("src/routes/club.routes.ts", API_RAIZ);
    assert.match(rutas, /\/:id\/licencia/);
  });

  it("UI de Ajustes muestra licencia federativa", () => {
    const modal = leer("components/clubes/ClubModal.tsx", WEB_RAIZ);
    assert.match(modal, /LicenciaClubPanel/);
    assert.match(modal, /Estado operativo/);
    const svc = leer("utils/services/licenciasClub.ts", WEB_RAIZ);
    assert.match(svc, /\/clubes\/\$\{clubId\}\/licencia/);
  });
});
