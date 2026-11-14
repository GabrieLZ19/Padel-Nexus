import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("ENT-25 preferencias push en campañas", () => {
  it("campaña in-app respeta preferencias (no forzarInApp)", () => {
    const envio = fuente("apps/api/src/services/comunicaciones.service.ts");
    const bloqueInApp = envio.match(
      /canal === "in_app"[\s\S]*?continue;\s*\n\s*\}/,
    );
    assert.ok(bloqueInApp, "debe existir rama in_app");
    assert.doesNotMatch(bloqueInApp![0], /forzarInApp:\s*true/);
    assert.match(bloqueInApp![0], /crearNotificacion/);
  });

  it("NotificacionService omite creación si push === false sin forzar", () => {
    const notif = fuente("apps/api/src/services/notificacion.service.ts");
    assert.match(notif, /!forzarInApp && prefs\.push === false/);
    assert.match(notif, /forzarInApp = false/);
  });
});
