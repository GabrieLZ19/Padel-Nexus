import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-32 texto solicitud de licencia", () => {
  it("LicenciaPagoPanel aclara que el pago puede ser antes o despues de la aprobacion", () => {
    const panel = readFileSync(
      path.join(RAIZ, "components/perfil/LicenciaPagoPanel.tsx"),
      "utf8",
    );
    assert.match(
      panel,
      /Podés pagar ahora o después de que la federación apruebe tu solicitud\./,
    );
    assert.doesNotMatch(
      panel,
      /Completá el pago para que la federación pueda revisar tu solicitud/,
    );
  });
});