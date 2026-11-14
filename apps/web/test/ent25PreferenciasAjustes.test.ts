import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-25 aria-label en preferencias de notificación", () => {
  it("ajustes de perfil declara aria-label en cada interruptor", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/ajustes/page.tsx"),
      "utf8",
    );
    assert.match(page, /aria-label=\{ariaLabel\}/);
    assert.match(page, /Recibir notificaciones en la plataforma/);
    assert.match(page, /Recibir notificaciones por correo electrónico/);
    assert.match(page, /Recibir notificaciones por WhatsApp/);
    assert.match(page, /role="switch"/);
  });
});
