import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("RES-7 DM jugador ↔ club", () => {
  it("backend resuelve admin_club e inicia conversacion por club_id", () => {
    const chatService = fuente("apps/api/src/services/chat.service.ts");
    assert.match(chatService, /resolverContactoClub/);
    assert.match(chatService, /iniciarConversacionClub/);
    assert.match(chatService, /\.eq\("rol", "admin_club"\)/);

    const controller = fuente("apps/api/src/controllers/chat.controller.ts");
    assert.match(controller, /club_id/);
    assert.match(controller, /iniciarConversacionClub/);
  });

  it("frontend expone iniciarChatClub y boton Escribir al club", () => {
    const service = fuente("apps/web/utils/services/chat.ts");
    assert.match(service, /iniciarChatClub/);
    assert.match(service, /club_id/);

    const btn = fuente("apps/web/components/reservas/EscribirAlClubButton.tsx");
    assert.match(btn, /Escribir al club/);

    const reservarClub = fuente(
      "apps/web/app/(public)/reservar/club/[id]/page.tsx",
    );
    assert.match(reservarClub, /EscribirAlClubButton/);

    const misReservas = fuente(
      "apps/web/app/(public)/mi-perfil/reservas/page.tsx",
    );
    assert.match(misReservas, /EscribirAlClubButton/);
  });

  it("inbox muestra nombre del club en DM con admin_club", () => {
    const inbox = fuente("apps/web/components/chat/ChatInbox.tsx");
    assert.match(inbox, /club_contacto/);
  });
});
