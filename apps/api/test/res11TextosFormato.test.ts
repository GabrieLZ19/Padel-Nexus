import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("RES-11 textos y formatos (lote)", () => {
  it("precios públicos usan formatMontoArs", () => {
    for (const archivo of [
      "web/app/(public)/reservar/club/[id]/page.tsx",
      "web/app/(public)/reservar/checkout/[reserva_id]/page.tsx",
      "web/app/(public)/mi-perfil/reservas/page.tsx",
    ]) {
      const fuente = readFileSync(path.join(RAIZ, archivo), "utf8");
      assert.match(fuente, /formatMontoArs/);
      assert.equal(fuente.includes("${turno?.precio"), false);
      assert.equal(fuente.includes("${slot.precio"), false);
    }
  });

  it("checkout muestra dirección del club", () => {
    const checkout = readFileSync(
      path.join(RAIZ, "web/app/(public)/reservar/checkout/[reserva_id]/page.tsx"),
      "utf8",
    );
    assert.match(checkout, /textoUbicacionClub/);
    const api = readFileSync(
      path.join(RAIZ, "api/src/services/reserva.service.ts"),
      "utf8",
    );
    assert.match(api, /direccion, latitud, longitud/);
  });

  it("voseo y notificaciones corregidos", () => {
    const chat = readFileSync(
      path.join(RAIZ, "web/components/chat/ChatInbox.tsx"),
      "utf8",
    );
    assert.match(chat, /Escribí un mensaje/);
    assert.equal(chat.includes("Escribe un mensaje"), false);

    const transf = readFileSync(
      path.join(RAIZ, "web/app/club/reservas/transferencias/page.tsx"),
      "utf8",
    );
    assert.match(transf, /Gestioná y aprobá/);
    assert.equal(transf.includes("Gestione"), false);

    const notif = readFileSync(
      path.join(RAIZ, "web/components/notificaciones/NotificationCenter.tsx"),
      "utf8",
    );
    assert.match(notif, /notificaciones en total/);
    assert.equal(notif.includes('notificación"'), false);
  });
});
