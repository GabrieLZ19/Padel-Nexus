import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-9 agenda del club muestra bloqueos", () => {
  it("agendaReservasClub consulta bloqueos_disponibilidad", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(svc, /agendaReservasClub[\s\S]*bloqueos_disponibilidad/);
    assert.match(svc, /armarFilasAgenda\(\s*[\s\S]*bloqueos \|\| \[\]/);
  });

  it("vista agenda del club distingue Libre de Bloqueado", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "../web/app/club/reservas/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /celda\.bloqueo/);
    assert.match(pagina, /Bloqueado/);
  });
});
