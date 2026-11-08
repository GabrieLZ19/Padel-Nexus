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

describe("ENT-10 CRM unificado superadmin", () => {
  it("expone contactos CRM y etiquetas en admin", () => {
    const rutas = leer("src/routes/admin.routes.ts", API_RAIZ);
    assert.match(rutas, /crm-contactos/);
    assert.match(rutas, /etiquetas/);
    const dash = leer("src/services/crm-dashboard.service.ts", API_RAIZ);
    assert.match(dash, /obtenerResumenInscripciones/);
    assert.match(dash, /jugadores_con_licencia/);
    const mig = readFileSync(
      path.resolve(API_RAIZ, "../../supabase/migrations/20261110120000_perfiles_etiquetas_contacto.sql"),
      "utf8",
    );
    assert.match(mig, /etiquetas_contacto/);
  });

  it("el front tiene base de contactos y métricas alineadas", () => {
    const jugadores = leer("app/dashboard/jugadores/page.tsx", WEB_RAIZ);
    assert.match(jugadores, /JugadoresContactosPanel/);
    assert.match(jugadores, /Base de contactos/);
    const dash = leer("components/dashboard/DashboardSuperadmin.tsx", WEB_RAIZ);
    assert.match(dash, /inscripciones_confirmadas|inscripcionesConfirmadas/);
    assert.match(dash, /jugadores_con_licencia/);
    const svc = leer("utils/services/crm-contactos.ts", WEB_RAIZ);
    assert.match(svc, /\/admin\/crm-contactos/);
  });
});
