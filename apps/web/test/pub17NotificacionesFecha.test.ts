import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { formatMarcaTiempoNotificacion } from "../utils/fechaArgentina.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-17 marca de tiempo en notificaciones", () => {
  it("NotificationCenter usa formatMarcaTiempoNotificacion", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/notificaciones/NotificationCenter.tsx"),
      "utf8",
    );
    assert.match(fuente, /formatMarcaTiempoNotificacion\(notif\.created_at\)/);
    assert.doesNotMatch(fuente, /toLocaleTimeString/);
  });

  it("hoy muestra Hoy y hora 24 h Argentina", () => {
    const ahora = new Date("2026-11-12T20:00:00.000Z");
    const label = formatMarcaTiempoNotificacion(
      "2026-11-12T17:14:00.000Z",
      ahora,
    );
    assert.equal(label, "Hoy 14:14");
  });

  it("ayer muestra solo Ayer", () => {
    const ahora = new Date("2026-11-12T20:00:00.000Z");
    const label = formatMarcaTiempoNotificacion(
      "2026-11-11T17:27:00.000Z",
      ahora,
    );
    assert.equal(label, "Ayer");
  });

  it("fechas anteriores muestran dd/mm HH:mm", () => {
    const ahora = new Date("2026-11-12T20:00:00.000Z");
    const label = formatMarcaTiempoNotificacion(
      "2026-11-10T17:45:00.000Z",
      ahora,
    );
    assert.equal(label, "10/11 14:45");
  });
});
