import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  debeForzarOrganizadorFap,
  usarPlanillaInscripcionFap,
} from "../utils/constants/fapApaRules.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("R5: Plataforma genérica sin FAP forzado", () => {
  it("debeForzarOrganizadorFap siempre retorna false para permitir elegir reglamento y entidad", () => {
    assert.equal(debeForzarOrganizadorFap("Nacional"), false);
    assert.equal(debeForzarOrganizadorFap("Provincial"), false);
    assert.equal(debeForzarOrganizadorFap("Regional"), false);
    assert.equal(debeForzarOrganizadorFap("Local"), false);
  });

  it("usarPlanillaInscripcionFap respeta si el torneo tiene reglamento APA", () => {
    assert.equal(
      usarPlanillaInscripcionFap({ alcance: "Nacional", reglamento: "APA" }),
      false,
    );
    assert.equal(
      usarPlanillaInscripcionFap({ alcance: "Provincial", reglamento: "APA" }),
      false,
    );
    assert.equal(
      usarPlanillaInscripcionFap({ alcance: "Nacional", reglamento: "FAP" }),
      true,
    );
  });

  it("el alta de jugador en signup/page.tsx no tiene referencias fijas a FAP", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "app/(auth)/signup/page.tsx"),
      "utf8",
    );
    assert.equal(fuente.includes("Circuito oficial FAP"), false);
    assert.equal(fuente.includes("LIC-FAP-"), false);
    assert.equal(fuente.includes("FEDERADO OFICIAL FAP"), false);
    assert.equal(fuente.includes("Jugador FAP"), false);
    assert.equal(fuente.includes("Federación Argentina de Pádel"), false);
    assert.equal(fuente.includes("DNI (Obligatorio FAP)"), false);
  });

  it("recuperación de contraseña no menciona circuito FAP", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "app/(auth)/forgot-password/page.tsx"),
      "utf8",
    );
    assert.equal(fuente.includes("circuito FAP"), false);
  });

  it("el paso 1 del wizard no bloquea el selector de reglamento ni entidad en Nacional", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.equal(fuente.includes("disabled={forzarFap}"), false);
    assert.equal(fuente.includes("-- FAP o asociación del ecosistema --"), false);
    assert.equal(fuente.includes("placeholder=\"Ej: Torneo FAP 5ª Categoría\""), false);
  });

  it("el paso 3 del wizard usa carnet federativo y no exige carnet FAP hardcodeado", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso3Categorias.tsx"),
      "utf8",
    );
    assert.equal(fuente.includes("title: \"Exigir carnet FAP\""), false);
    assert.equal(fuente.includes("Exige carnet federativo FAP vigente"), false);
    assert.match(fuente, /title: "Exigir carnet federativo"/);
  });

  it("el cierre de torneo de club en Paso7Cierre no muestra FAP Local Ranking", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso7Cierre.tsx"),
      "utf8",
    );
    assert.match(fuente, /Ranking Local/);
  });

  it("la tabla de posiciones de zona y sorteo no mencionan FAP en empate técnico", () => {
    const tabla = readFileSync(
      path.join(RAIZ, "components/torneos/TablaPosicionesZona.tsx"),
      "utf8",
    );
    assert.equal(tabla.includes("Empate técnico absoluto FAP"), false);
    assert.match(tabla, /Empate técnico absoluto en \{nombreZona\}/);

    const sorteo = readFileSync(
      path.join(RAIZ, "components/torneos/ModalSorteoZona.tsx"),
      "utf8",
    );
    assert.equal(sorteo.includes("Reglamento FAP"), false);
  });

  it("las páginas de clubes y asociaciones usan etiquetas genéricas de afiliación", () => {
    const reservaClub = readFileSync(
      path.join(RAIZ, "app/(public)/reservar/club/[id]/page.tsx"),
      "utf8",
    );
    assert.equal(reservaClub.includes("Club Afiliado FAP"), false);

    const configClub = readFileSync(
      path.join(RAIZ, "app/club/configuracion/page.tsx"),
      "utf8",
    );
    assert.equal(configClub.includes("Afiliado FAP"), false);

    const asocList = readFileSync(
      path.join(RAIZ, "app/dashboard/asociaciones/page.tsx"),
      "utf8",
    );
    assert.equal(asocList.includes("Entidades Afiliadas FAP"), false);

    const asocDetail = readFileSync(
      path.join(RAIZ, "app/dashboard/asociaciones/[id]/page.tsx"),
      "utf8",
    );
    assert.equal(asocDetail.includes("Entidad Afiliada FAP"), false);
  });

  it("las comprobaciones de elegibilidad usan carnet federativo", () => {
    const elegibilidad = readFileSync(
      path.join(RAIZ, "utils/inscripcionElegibilidad.ts"),
      "utf8",
    );
    assert.equal(elegibilidad.includes("label: \"Carnet FAP activo\""), false);
    assert.equal(elegibilidad.includes("label: \"Carnet FAP\""), false);
  });
});
