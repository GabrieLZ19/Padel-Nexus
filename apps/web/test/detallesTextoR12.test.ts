import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatNombreJugador } from "../utils/formatoNombreJugador";
import { PAGE_SIZE_JUGADORES } from "../utils/jugadoresListado";
import { CATEGORIAS_RECREATIVAS_CLUB, FORMATOS_TORNEO_CLUB } from "../utils/constants/fapApaRules";

function leerArchivo(subpath: string): string {
  return fs.readFileSync(path.resolve("apps/web", subpath), "utf8");
}

describe("Sección 3 - Detalles de texto e interfaz", () => {
  it("Item 1: Configuración del club usa voseo (Gestioná)", () => {
    const contenido = leerArchivo("app/club/configuracion/page.tsx");
    assert.ok(contenido.includes("Gestioná los datos institucionales"));
    assert.ok(!contenido.includes("Gestione los datos institucionales"));
  });

  it("Item 2: Canchas plantilla de turnos usa voseo (Seleccioná)", () => {
    const contenido = leerArchivo("app/club/canchas/page.tsx");
    assert.ok(contenido.includes("Seleccioná un día para administrar tu plantilla"));
    assert.ok(!contenido.includes("Seleccione un día para administrar su plantilla"));
  });

  it("Item 3: Crear torneo unifica Super 8 entre categorías y formatos", () => {
    const catSuper8 = CATEGORIAS_RECREATIVAS_CLUB.find((c) => c.value === "Super 8");
    const formatoSuper8 = FORMATOS_TORNEO_CLUB.find((f) => f.value === "Super 8");
    assert.ok(catSuper8);
    assert.ok(formatoSuper8);
    assert.equal(catSuper8.label, "Super 8");
    assert.equal(formatoSuper8.label, "Super 8");
  });

  it("Item 4: Jugadores sin apellido muestran solo el nombre sin coma previa", () => {
    assert.equal(formatNombreJugador("Gabriel", null), "Gabriel");
    assert.equal(formatNombreJugador("Gab", undefined), "Gab");
    assert.equal(formatNombreJugador("Gabriel", ""), "Gabriel");
    assert.equal(formatNombreJugador("Gabriel", "Perez"), "PEREZ, Gabriel");
    assert.equal(formatNombreJugador(null, null), "Jugador anónimo");
  });

  it("Item 5: Alta de jugador respeta mayúsculas de acrónimos como QA Prueba", () => {
    const contenido = leerArchivo("app/(auth)/signup/page.tsx");
    assert.ok(contenido.includes("capitalizarPalabra"));
    assert.ok(contenido.includes("word.length <= 4"));
  });

  it("Item 6: Panel de Federación normaliza tilde y nombre institucional", () => {
    const contenido = leerArchivo("app/dashboard/layout.tsx");
    assert.ok(contenido.includes('nom = "Federación";'));
    assert.ok(contenido.includes('"Federación Nacional"'));
  });

  it("Item 7: Listado de jugadores de Federación abre con 25 filas (GEN-10)", () => {
    assert.equal(PAGE_SIZE_JUGADORES, 25);
  });

  it("Item 8: Ranking nacional tiene categoría obligatoria por RAN-01", () => {
    const contenido = leerArchivo("app/dashboard/rankings/page.tsx");
    assert.ok(contenido.includes('useState<string>("8ª")'));
    assert.ok(!contenido.includes('Todas las categorías (${tipoConfig.label})'));
  });

  it("Item 9: Login muestra íconos diferenciados para los 4 estamentos", () => {
    const contenido = leerArchivo("app/(auth)/login/page.tsx");
    assert.ok(contenido.includes("Shield"));
    assert.ok(contenido.includes("Network"));
    assert.ok(contenido.includes("CanchaIcon"));
    assert.ok(contenido.includes("Users"));
  });
});
