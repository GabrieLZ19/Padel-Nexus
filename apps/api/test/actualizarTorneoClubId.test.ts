import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("P1: actualizarTorneo no desvincula club_id de admin_club", () => {
  it("el service recibe el user y restaura club_id del perfil", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(
      fuente,
      /static async actualizarTorneo\(\s*id: string,\s*datos: any,\s*user\?:/,
    );
    assert.match(fuente, /cuenta\.rol === "admin_club" && cuenta\.clubId/);
    assert.match(fuente, /updateData\.club_id = cuenta\.clubId/);
  });

  it("updateTorneo del controller pasa req.user al service", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(
      fuente,
      /TorneoService\.actualizarTorneo\(\s*req\.params\.id,\s*req\.body,\s*req\.user,/,
    );
  });
});
