import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-30 panel comunicaciones", () => {
  it("deshabilita WhatsApp, aclara mail y etiqueta Jugador en audiencia", () => {
    const panel = readFileSync(
      path.join(RAIZ, "components/comunicaciones/ComunicacionesPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /CAMPANA_CANAL_WHATSAPP_HABILITADO\s*=\s*false/);
    assert.match(
      panel,
      /canal === "whatsapp" && !CAMPANA_CANAL_WHATSAPP_HABILITADO/,
    );
    assert.match(panel, /Por mail solo sale la recuperación de contraseña/);
    assert.match(panel, /ruta interna como \/ranking/);
    assert.doesNotMatch(panel, /ruta interna \(`\/ranking`\)/);
    assert.match(panel, /etiquetaRolAudiencia/);
    assert.match(panel, /rol === "usuario"\) return "Jugador"/);
    assert.match(panel, /etiquetaRolAudiencia\(s\.rol\)/);
  });
});
