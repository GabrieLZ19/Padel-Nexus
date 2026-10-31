import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("R10 - Notificar a las parejas del sorteo reglamentario", () => {
  interface MockInscripcion {
    id: string;
    usuario_id: string | null;
    usuario2_id: string | null;
    jugador1_nombre: string;
    jugador2_nombre: string | null;
  }

  function extractDestinatarios(inscripciones: MockInscripcion[]) {
    const destinatarios: Array<{ usuarioId: string; nombre: string }> = [];
    const seen = new Set<string>();

    for (const inc of inscripciones) {
      if (inc.usuario_id && !seen.has(inc.usuario_id)) {
        seen.add(inc.usuario_id);
        destinatarios.push({
          usuarioId: inc.usuario_id,
          nombre: inc.jugador1_nombre,
        });
      }
      if (inc.usuario2_id && !seen.has(inc.usuario2_id)) {
        seen.add(inc.usuario2_id);
        destinatarios.push({
          usuarioId: inc.usuario2_id,
          nombre: inc.jugador2_nombre || "Compañero",
        });
      }
    }
    return destinatarios;
  }

  function buildNotificacionMensaje(params: {
    nombreTorneo: string;
    nombreZona: string;
    fechaHora: string;
    mensaje?: string;
  }) {
    const titulo = `Sorteo Reglamentario · ${params.nombreTorneo} (${params.nombreZona})`;
    const mensajeBase = `Aviso de sorteo: Se ha detectado un empate técnico absoluto en ${params.nombreZona}. El sorteo reglamentario para definir los puestos de clasificación se llevará a cabo el ${params.fechaHora}.`;
    const mensajeFinal = params.mensaje?.trim()
      ? `${mensajeBase} Detalle: ${params.mensaje.trim()}`
      : mensajeBase;

    return { titulo, mensaje: mensajeFinal };
  }

  it("extrae todos los jugadores únicos de las parejas empatadas en la zona", () => {
    const inscripciones: MockInscripcion[] = [
      {
        id: "inc-1",
        usuario_id: "usr-belasteguin",
        usuario2_id: "usr-coello",
        jugador1_nombre: "Fernando Belasteguín",
        jugador2_nombre: "Arturo Coello",
      },
      {
        id: "inc-2",
        usuario_id: "usr-galan",
        usuario2_id: "usr-chingotto",
        jugador1_nombre: "Alejandro Galán",
        jugador2_nombre: "Federico Chingotto",
      },
    ];

    const dests = extractDestinatarios(inscripciones);
    assert.equal(dests.length, 4);
    assert.deepEqual(
      dests.map((d) => d.usuarioId),
      ["usr-belasteguin", "usr-coello", "usr-galan", "usr-chingotto"],
    );
  });

  it("soporta parejas donde el compañero no tiene usuario registrado aún (usuario2_id null)", () => {
    const inscripciones: MockInscripcion[] = [
      {
        id: "inc-1",
        usuario_id: "usr-1",
        usuario2_id: null,
        jugador1_nombre: "Jugador Titular",
        jugador2_nombre: "Invitado Manual",
      },
    ];

    const dests = extractDestinatarios(inscripciones);
    assert.equal(dests.length, 1);
    assert.equal(dests[0].usuarioId, "usr-1");
  });

  it("construye el título y mensaje con fecha, hora y detalle de videollamada / mesa", () => {
    const notif = buildNotificacionMensaje({
      nombreTorneo: "TRN PRUEBA 22-10",
      nombreZona: "Zona B",
      fechaHora: "2026-11-01T15:30",
      mensaje: "Transmisión en vivo por Google Meet: meet.google.com/abc-defg-hij",
    });

    assert.equal(notif.titulo, "Sorteo Reglamentario · TRN PRUEBA 22-10 (Zona B)");
    assert.ok(notif.mensaje.includes("Zona B"));
    assert.ok(notif.mensaje.includes("2026-11-01T15:30"));
    assert.ok(
      notif.mensaje.includes("Transmisión en vivo por Google Meet: meet.google.com/abc-defg-hij"),
    );
  });

  it("valida que día y hora sean obligatorios", () => {
    const validarFechaHora = (fechaHora?: string) => {
      if (!fechaHora || typeof fechaHora !== "string" || !fechaHora.trim()) {
        throw new Error("Debe indicar el día y hora programados para el sorteo.");
      }
      return true;
    };

    assert.throws(() => validarFechaHora(""), /Debe indicar el día y hora programados/);
    assert.throws(() => validarFechaHora("   "), /Debe indicar el día y hora programados/);
    assert.ok(validarFechaHora("2026-11-01 18:00"));
  });
});

