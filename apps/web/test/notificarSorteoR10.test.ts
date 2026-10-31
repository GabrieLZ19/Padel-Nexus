import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("R10 - Notificar a las parejas del sorteo (Frontend)", () => {
  const modalPath = path.resolve("apps/web/components/torneos/ModalSorteoZona.tsx");
  const tablaPath = path.resolve("apps/web/components/torneos/TablaPosicionesZona.tsx");
  const servicePath = path.resolve("apps/web/utils/services/torneos.ts");

  it("ModalSorteoZona incluye la sección de aviso previo a las parejas con input de fecha y hora", () => {
    const code = fs.readFileSync(modalPath, "utf-8");
    assert.ok(
      code.includes("Aviso previo a las parejas"),
      "ModalSorteoZona debe incluir el panel de aviso previo a las parejas",
    );
    assert.ok(
      code.includes("type=\"datetime-local\""),
      "ModalSorteoZona debe permitir ingresar día y hora del sorteo",
    );
    assert.ok(
      code.includes("handleEnviarNotificacion"),
      "ModalSorteoZona debe tener el manejador para enviar la notificación",
    );
    assert.ok(
      code.includes("TorneosService.notificarSorteoZona"),
      "ModalSorteoZona debe llamar a TorneosService.notificarSorteoZona",
    );
  });

  it("ModalSorteoZona incluye la aclaración reglamentaria de transmisión por videollamada / grabación", () => {
    const code = fs.readFileSync(modalPath, "utf-8");
    assert.ok(
      code.includes("El sorteo digital se puede mostrar en vivo a los jugadores por videollamada"),
      "Debe incluir la indicación de que el sorteo se puede transmitir o grabar",
    );
  });

  it("TablaPosicionesZona muestra el botón «Notificar Sorteo» junto a «Resolver Sorteo» en empates pendientes", () => {
    const code = fs.readFileSync(tablaPath, "utf-8");
    assert.ok(
      code.includes("Notificar Sorteo"),
      "TablaPosicionesZona debe tener botón visible 'Notificar Sorteo'",
    );
    assert.ok(
      code.includes("modoInicialModal"),
      "TablaPosicionesZona debe configurar el modo inicial del modal según el botón presionado",
    );
  });

  it("TorneosService expone el método notificarSorteoZona apuntando al endpoint REST correcto", () => {
    const code = fs.readFileSync(servicePath, "utf-8");
    assert.ok(
      code.includes("async notificarSorteoZona"),
      "TorneosService debe exportar notificarSorteoZona",
    );
    assert.ok(
      code.includes("/sorteo/notificar"),
      "TorneosService debe llamar al endpoint /torneos/:id/zonas/:nombreZona/sorteo/notificar",
    );
  });
});

