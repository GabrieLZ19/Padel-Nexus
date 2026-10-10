import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { clubesVisiblesEnReserva } from "../../web/utils/clubesReserva";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("PER-03 reservar en el celular", () => {
  it("deja afuera los clubes sin canchas y, con ubicación, ordena por cercanía", () => {
    const clubes = [
      { nombre: "Lejos", canchas: 2, distancia_km: 12 },
      { nombre: "Vacío", canchas: 0, distancia_km: 0.2 },
      { nombre: "Cerca", canchas: 1, distancia_km: 1.4 },
      { nombre: "Sin dato", canchas: 3, distancia_km: null },
    ];

    assert.deepEqual(
      clubesVisiblesEnReserva(clubes, true).map((club) => club.nombre),
      ["Cerca", "Lejos", "Sin dato"],
    );
    assert.deepEqual(
      clubesVisiblesEnReserva(clubes, false).map((club) => club.nombre),
      ["Lejos", "Vacío", "Cerca", "Sin dato"].filter((nombre) => nombre !== "Vacío"),
    );
  });

  it("el visitante lista clubes y la sesión se pide al elegir el turno", () => {
    const listado = fuente("apps/web/app/(public)/reservar/page.tsx");
    const ficha = fuente("apps/web/app/(public)/reservar/club/[id]/page.tsx");
    const rutasClubes = fuente("apps/api/src/routes/club.routes.ts");
    const rutasReservas = fuente("apps/api/src/routes/reserva.routes.ts");

    assert.match(listado, /clubesVisiblesEnReserva/);
    assert.doesNotMatch(listado, /Iniciá sesión para ver clubes/);
    assert.match(rutasClubes, /router\.get\("\/", optionalAuthenticate, getAllClubes\)/);
    assert.match(
      rutasReservas,
      /optionalAuthenticate,\s*ReservasController\.getDisponibilidad/,
    );
    assert.match(ficha, /\/login\?redirect=/);
    assert.doesNotMatch(ficha, /Iniciá sesión para ver horarios/);
  });

  it("separa próximas y pasadas, y las etiquetas salen en español", () => {
    const reservas = fuente("apps/web/app/(public)/mi-perfil/reservas/page.tsx");
    const avisos = fuente("apps/web/components/notificaciones/NotificationCenter.tsx");

    assert.match(reservas, /Próximas/);
    assert.match(reservas, /Pasadas/);
    assert.match(avisos, /label: "Éxito"/);
    assert.match(avisos, /label: "Aviso"/);
    assert.match(avisos, /Promoción/);
    assert.doesNotMatch(avisos, /label: tipo/);
    assert.doesNotMatch(avisos, /"Promo"/);
  });

  it("a 375 px el contenido puede pasar por encima del chat", () => {
    const layout = fuente("apps/web/app/(public)/layout.tsx");
    const ficha = fuente("apps/web/app/(public)/reservar/club/[id]/page.tsx");
    const chat = fuente("apps/web/components/soporte/SoporteChat.tsx");
    const ajustes = fuente("apps/web/app/(public)/mi-perfil/ajustes/page.tsx");

    assert.match(layout, /pb-28/);
    assert.match(ficha, /max-sm:pr-24/);
    assert.match(ficha, /max-sm:pr-20/);
    assert.match(ajustes, /max-sm:pr-20/);
    assert.match(chat, /w-\[min\(360px,calc\(100vw-2rem\)\)\]/);
  });
});
