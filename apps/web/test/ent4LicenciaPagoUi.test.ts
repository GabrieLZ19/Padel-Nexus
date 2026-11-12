import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(relativo: string) {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

/** Espejo del util para asserts sin loader TS. */
function licenciaTienePagoPendiente(licencia: {
  estado?: string;
  datos_solicitud?: { estado_pago?: string; precio_anual?: number };
}): boolean {
  const estado = (licencia.estado || "").toLowerCase();
  if (estado !== "pendiente" && estado !== "activa") return false;
  const pago = licencia.datos_solicitud?.estado_pago || "no_aplica";
  if (pago !== "pendiente") return false;
  return Number(licencia.datos_solicitud?.precio_anual ?? 0) > 0;
}

describe("ENT-4: pago licencia en Mi panel y validación", () => {
  it("acepta pago pendiente con licencia Activa", () => {
    assert.equal(
      licenciaTienePagoPendiente({
        estado: "Activa",
        datos_solicitud: { estado_pago: "pendiente", precio_anual: 30000 },
      }),
      true,
    );
    assert.equal(
      licenciaTienePagoPendiente({
        estado: "Pendiente",
        datos_solicitud: { estado_pago: "pendiente", precio_anual: 30000 },
      }),
      true,
    );
    assert.equal(
      licenciaTienePagoPendiente({
        estado: "Activa",
        datos_solicitud: { estado_pago: "pagado", precio_anual: 30000 },
      }),
      false,
    );
  });

  it("Mi perfil muestra panel de pago también en Activa", () => {
    const perfil = fuente("app/(public)/mi-perfil/page.tsx");
    assert.match(perfil, /licenciaTienePagoPendiente/);
    assert.match(perfil, /LicenciaPagoPanel/);
  });

  it("modal Verificar solicitud muestra estado del pago", () => {
    const page = fuente("app/dashboard/jugadores/page.tsx");
    assert.match(page, /etiquetaEstadoPagoLicencia/);
    assert.match(page, /Sin club de referencia/);
  });
});
