import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resumirLicenciasPorJugador } from "../src/utils/resumenLicencias.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("ENT-5 estados licencia (feature 10.0)", () => {
  it("resumen cuenta suspendidas, no rechazadas", () => {
    const resumen = resumirLicenciasPorJugador([
      { licencias: [{ estado: "Suspendida" }] },
    ]);
    assert.equal(resumen.suspendidas, 1);
    assert.equal(
      (resumen as { rechazadas?: number }).rechazadas,
      undefined,
    );
  });

  it("FILTRO_A_ESTADO mapea Suspendidas a estado Suspendida en API", () => {
    const pagina = fuente("apps/web/app/dashboard/jugadores/page.tsx");
    const bloque = pagina.slice(
      pagina.indexOf("const FILTRO_A_ESTADO"),
      pagina.indexOf("const getDisplayLicencia"),
    );
    assert.match(bloque, /Suspendidas:\s*"Suspendida"/);
    assert.doesNotMatch(bloque, /Rechazadas/);
  });

  it("pendiente a suspendida elimina (rechazo); activa a suspendida conserva fila", () => {
    const licencia = fuente("apps/api/src/services/licencia.service.ts");
    const rechazo = licencia.indexOf("estado === \"Suspendida\" && estadoPrevio === \"Pendiente\"");
    assert.ok(rechazo >= 0);
    assert.match(licencia, /Solicitud de Alta Rechazada/);
    assert.match(licencia, /estado === "Suspendida" && estadoPrevio === "Activa"/);
    assert.match(licencia, /darDeBajaLicencia/);
  });

  it("UI distingue Suspendidas, Suspender y Dar de baja", () => {
    const pagina = fuente("apps/web/app/dashboard/jugadores/page.tsx");
    assert.match(pagina, /Suspendidas/);
    assert.doesNotMatch(pagina, /"Rechazadas"/);

    const fila = fuente("apps/web/components/licencias/LicenciaJugadorCard.tsx");
    assert.match(fila, /label: "Suspendida"/);
    assert.match(fila, /label: "Suspender"/);
    assert.match(fila, /label: "Dar de baja"/);
  });
});
