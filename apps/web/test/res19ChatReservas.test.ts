import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { formatSeparadorDiaChat } from "../utils/fechaArgentina.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-19 chat reservas y separadores", () => {
  it("formatSeparadorDiaChat devuelve Hoy, Ayer o dd/mm/aaaa", () => {
    const ahora = new Date("2026-06-15T15:00:00-03:00");
    assert.equal(
      formatSeparadorDiaChat("2026-06-15T10:00:00-03:00", ahora),
      "Hoy",
    );
    assert.equal(
      formatSeparadorDiaChat("2026-06-14T10:00:00-03:00", ahora),
      "Ayer",
    );
    assert.equal(
      formatSeparadorDiaChat("2026-05-01T10:00:00-03:00", ahora),
      "01/05/2026",
    );
  });

  it("useIniciarChatClub propaga ref_* de reserva", () => {
    const hook = readFileSync(
      path.join(RAIZ, "hooks/useIniciarChatClub.ts"),
      "utf8",
    );
    assert.match(hook, /ref_club/);
    assert.match(hook, /ref_cancha/);
    assert.match(hook, /ContextoReservaParaChat/);
  });

  it("ChatInbox muestra Club, separadores y referencia de reserva", () => {
    const inbox = readFileSync(
      path.join(RAIZ, "components/chat/ChatInbox.tsx"),
      "utf8",
    );
    const bubble = readFileSync(
      path.join(RAIZ, "components/chat/ChatMessageBubble.tsx"),
      "utf8",
    );
    assert.match(inbox, /admin_club:\s*"Club"/);
    assert.match(inbox, /ChatSeparadorDia/);
    assert.match(inbox, /Reserva de referencia/);
    assert.match(inbox, /ref_cancha/);
    assert.match(bubble, /ChatSeparadorDia/);
  });
});
