import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-29 copy de pago y representación provincial", () => {
  it("panel de pago menciona solo Mercado Pago si no hay transferencia", () => {
    const panel = readFileSync(
      path.join(RAIZ, "components/perfil/LicenciaPagoPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /Por ahora el pago es con Mercado Pago/);
    assert.doesNotMatch(
      panel,
      /El pago por transferencia no está habilitado/,
    );
  });

  it("modal de solicitud condiciona texto de transferencia", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/perfil/LicenciaModal.tsx"),
      "utf8",
    );
    assert.match(modal, /transferencia_disponible/);
    assert.match(modal, /Por ahora el pago es con Mercado Pago/);
  });

  it("representación provincial distingue licencia en trámite", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/representacionProvincialMiPerfil.ts"),
      "utf8",
    );
    assert.match(util, /Según tu licencia en trámite/);
    assert.match(util, /Según tu licencia activa/);
    const perfil = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/page.tsx"),
      "utf8",
    );
    assert.match(perfil, /textoRepresentacionDesdeLicencia/);
  });
});
