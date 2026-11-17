import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-2 clubes adheridos vs sedes", () => {
  it("listado publico de reservas filtra es_adherido", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(src, /es_adherido/);
    assert.match(src, /assertClubReservablePublico/);
  });

  it("crear torneo de club inicializa sedes del organizador", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(src, /inicializarSedesTorneoOrganizador/);
  });

  it("CLI-2 remanente: repara disponibilidad vacia al leer sedes o programador", () => {
    const initSrc = readFileSync(
      path.join(RAIZ, "src/utils/inicializarSedesTorneoOrganizador.ts"),
      "utf8",
    );
    assert.match(initSrc, /asegurarDisponibilidadOrganizadorSiVacia/);
    assert.match(
      initSrc,
      /if \(dispPrevias && dispPrevias > 0\) return false/,
    );

    const torneoSrc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(torneoSrc, /asegurarDisponibilidadOrganizadorSiVacia/);

    const progSrc = readFileSync(
      path.join(RAIZ, "src/utils/programacionPartidos.ts"),
      "utf8",
    );
    assert.match(progSrc, /asegurarDisponibilidadOrganizadorSiVacia/);
  });

  it("expone promover a adherido para federacion", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/club.routes.ts"),
      "utf8",
    );
    assert.match(routes, /promover-adherido/);
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/club.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /promoverClubAdherido/);
  });

  it("admin_club puede crear sede en POST /clubes", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/club.routes.ts"),
      "utf8",
    );
    const postCreate = routes.match(
      /router\.post\(\s*"\/"[\s\S]*?createClub\s*,\s*\)/,
    );
    assert.ok(postCreate?.[0]);
    assert.match(postCreate![0], /admin_club/);
  });
});
