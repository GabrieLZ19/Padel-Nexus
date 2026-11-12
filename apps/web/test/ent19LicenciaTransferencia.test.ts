import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-19 · transferencia licencia en panel y CRM", () => {
  it("CRM guarda alias/CBU y el panel consulta datos-transferencia", () => {
    const config = readFileSync(
      path.join(RAIZ, "components/licencias/ConfigLicenciasPanel.tsx"),
      "utf8",
    );
    assert.match(config, /pago_alias/);
    assert.match(config, /Transferencia bancaria/);

    const panel = readFileSync(
      path.join(RAIZ, "components/perfil/LicenciaPagoPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /getDatosTransferencia/);
    assert.match(panel, /transferenciaDisponible/);

    const svc = readFileSync(
      path.join(RAIZ, "utils/services/licencias.ts"),
      "utf8",
    );
    assert.match(svc, /datos-transferencia/);
  });
});
