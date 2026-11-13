import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  evaluarAdminClubAccesoLicencia,
  evaluarParametrosLicenciaClub,
} from "../src/utils/licenciaClubAcceso.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const API = process.env.API_URL || "http://127.0.0.1:4000";
const CLUB_EMAIL = process.env.PUB15_CLUB_EMAIL || process.env.CLUB_EMAIL || "";
const CLUB_PASSWORD = process.env.PUB15_CLUB_PASSWORD || process.env.CLUB_PASSWORD || "";
const OTRO_CLUB_ID = process.env.PUB15_OTRO_CLUB_ID || "";

async function pedir(
  pathRelativo: string,
  token: string | null,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const respuesta = await fetch(`${API}${pathRelativo}`, { ...init, headers });
  const texto = await respuesta.text();
  let body: unknown = texto;
  try {
    body = texto ? JSON.parse(texto) : null;
  } catch {
    body = texto;
  }
  return { status: respuesta.status, body };
}

describe("PUB-15 pagos de licencia de club para admin_club", () => {
  it("rechaza parámetros de club o licencia vacíos", () => {
    assert.deepEqual(evaluarParametrosLicenciaClub("", "lic-1"), {
      status: 400,
      error: "Club y licencia son obligatorios.",
    });
    assert.equal(evaluarParametrosLicenciaClub("club-1", "lic-1"), null);
  });

  it("admin_club de otro club recibe 403 al consultar licencia ajena", () => {
    const denegado = evaluarAdminClubAccesoLicencia({
      rol: "admin_club",
      clubIdEnUrl: "4930a3ab-f05a-4c21-b170-5b9b6b46932c",
      clubIdDelPerfil: "11111111-1111-1111-1111-111111111111",
    });
    assert.deepEqual(denegado, {
      status: 403,
      error: "No podés ver la licencia de otro club.",
    });
  });

  it("admin_club con club correcto puede continuar la lectura", () => {
    const clubId = "4930a3ab-f05a-4c21-b170-5b9b6b46932c";
    assert.equal(
      evaluarAdminClubAccesoLicencia({
        rol: "admin_club",
        clubIdEnUrl: clubId,
        clubIdDelPerfil: clubId,
      }),
      null,
    );
  });

  it("roles federativos no quedan limitados por club del perfil", () => {
    assert.equal(
      evaluarAdminClubAccesoLicencia({
        rol: "admin_federacion",
        clubIdEnUrl: "cualquier-club",
        clubIdDelPerfil: null,
      }),
      null,
    );
  });

  it("GET pagos usa validación y filtra por licencia_club_id", () => {
    const rutas = readFileSync(
      path.join(RAIZ, "src/routes/club.routes.ts"),
      "utf8",
    );
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/licenciaClub.controller.ts"),
      "utf8",
    );
    const svc = readFileSync(
      path.join(RAIZ, "src/services/licenciaClub.service.ts"),
      "utf8",
    );

    const idx = rutas.indexOf('"/:id/licencia/:licenciaId/pagos"');
    assert.ok(idx > 0);
    const pagosRoute = rutas.slice(idx, idx + 320);
    assert.match(pagosRoute, /admin_club/);
    assert.match(ctrl, /validarLecturaLicenciaClub/);
    assert.match(ctrl, /evaluarAdminClubAccesoLicencia/);
    assert.match(ctrl, /licenciaPerteneceAClub/);
    assert.match(svc, /\.eq\("licencia_club_id", licenciaId\)/);
  });

  it("pagos de jugador (licencias) no incluyen admin_club en la ruta", () => {
    const rutas = readFileSync(
      path.join(RAIZ, "src/routes/licencia.routes.ts"),
      "utf8",
    );
    const idx = rutas.indexOf('"/:id/pagos"');
    assert.ok(idx > 0);
    const bloque = rutas.slice(idx, idx + 280);
    assert.doesNotMatch(bloque, /admin_club/);
  });

  it("integración: admin_club no lista pagos de licencia de otro club", async (t) => {
    if (!CLUB_EMAIL || !CLUB_PASSWORD || !OTRO_CLUB_ID) {
      t.skip(
        "Definí PUB15_CLUB_EMAIL, PUB15_CLUB_PASSWORD y PUB15_OTRO_CLUB_ID (o CLUB_* + PUB15_OTRO_CLUB_ID)",
      );
      return;
    }

    let login: { status: number; body: unknown };
    try {
      login = await pedir("/api/perfil/login", null, {
        method: "POST",
        body: JSON.stringify({ email: CLUB_EMAIL, password: CLUB_PASSWORD }),
      });
    } catch (error) {
      const causa = error instanceof Error ? error.cause : error;
      const codigo =
        causa && typeof causa === "object" && "code" in causa
          ? String((causa as { code?: string }).code)
          : "";
      if (codigo === "ECONNREFUSED") {
        t.skip(`API no disponible en ${API}`);
        return;
      }
      throw error;
    }

    assert.equal(login.status, 200);
    const token = (login.body as { token?: string }).token;
    assert.ok(token);

    const licenciaAjena = "00000000-0000-4000-8000-000000000001";
    const resp = await pedir(
      `/api/clubes/${encodeURIComponent(OTRO_CLUB_ID)}/licencia/${licenciaAjena}/pagos`,
      token,
    );

    assert.equal(resp.status, 403);
    const err = (resp.body as { error?: string })?.error || "";
    assert.match(err, /otro club/i);
  });
});
