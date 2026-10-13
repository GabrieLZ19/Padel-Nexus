import assert from "node:assert/strict";
import { describe, it } from "node:test";

const API = process.env.API_URL || "http://127.0.0.1:4000";
const EMAIL = process.env.CLUB_EMAIL || "";
const PASSWORD = process.env.CLUB_PASSWORD || "";

interface TorneoLista {
  id: string;
  nombre?: string;
  alcance?: string | null;
  solo_lectura?: boolean;
  puede_cargar_resultados?: boolean;
}

function esNacional(alcance: string | null | undefined): boolean {
  return String(alcance || "").trim().toLowerCase() === "nacional";
}

async function pedir(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const respuesta = await fetch(`${API}${path}`, { ...init, headers });
  const texto = await respuesta.text();
  let body: unknown = texto;
  try {
    body = texto ? JSON.parse(texto) : null;
  } catch {
    body = texto;
  }
  return { status: respuesta.status, body };
}

function mensaje(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const data = body as { message?: string; error?: string };
  return String(data.message || data.error || "");
}

describe("cuenta New Center sobre un nacional", () => {
  it("consulta el torneo de otra entidad y no puede editarlo, reprogramarlo ni cargar un resultado", async (t) => {
    if (!EMAIL || !PASSWORD) {
      t.skip("Definí CLUB_EMAIL y CLUB_PASSWORD para correr esta prueba contra la API");
      return;
    }
    let login: { status: number; body: unknown };
    try {
      login = await pedir("/api/perfil/login", null, {
        method: "POST",
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
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

    assert.equal(login.status, 200, mensaje(login.body) || "login");
    const token = (login.body as { token?: string }).token;
    assert.ok(token, "el login no devolvió token");

    const lista = await pedir(
      "/api/torneos?page=1&limit=100&vista=todos&incluir_borradores=true",
      token,
    );
    assert.equal(lista.status, 200, mensaje(lista.body));
    const torneos = (
      Array.isArray(lista.body)
        ? lista.body
        : ((lista.body as { data?: TorneoLista[] }).data ?? [])
    ) as TorneoLista[];

    const nacional = torneos.find((torneo) => esNacional(torneo.alcance));
    assert.ok(
      nacional,
      "New Center no tiene un torneo nacional en el listado para validar",
    );
    assert.equal(nacional.solo_lectura, true, nacional.nombre);
    assert.equal(nacional.puede_cargar_resultados, false, nacional.nombre);

    const propio = torneos.find((torneo) => !esNacional(torneo.alcance));
    if (propio) {
      assert.notEqual(propio.solo_lectura, true, propio.nombre);
      assert.equal(propio.puede_cargar_resultados, true, propio.nombre);
    }

    const detalle = await pedir(`/api/torneos/${nacional.id}`, token);
    assert.equal(detalle.status, 200);
    const ficha = detalle.body as TorneoLista;
    assert.equal(ficha.solo_lectura, true);
    assert.equal(ficha.puede_cargar_resultados, false);

    const edicion = await pedir(`/api/torneos/${nacional.id}`, token, {
      method: "PUT",
      body: JSON.stringify({ nombre: nacional.nombre }),
    });
    assert.equal(edicion.status, 403);
    assert.match(mensaje(edicion.body), /solo aporta las instalaciones/);

    const horario = await pedir(
      `/api/torneos/${nacional.id}/programacion/asignar`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          partido_id: "00000000-0000-0000-0000-000000000000",
          fecha_iso: "2026-10-13T10:00:00",
          cancha_label: "Cancha 1",
        }),
      },
    );
    assert.equal(horario.status, 403);
    assert.match(mensaje(horario.body), /solo aporta las instalaciones/);

    const tablero = await pedir(
      `/api/torneos/${nacional.id}/programacion/board`,
      token,
    );
    assert.equal(tablero.status, 200);
    assert.equal(
      (tablero.body as { solo_lectura?: boolean }).solo_lectura,
      true,
    );

    const partidos = await pedir(`/api/torneos/${nacional.id}/partidos`, token);
    const filas = Array.isArray(partidos.body)
      ? (partidos.body as { id?: string }[])
      : ((partidos.body as { data?: { id?: string }[] })?.data ?? []);
    const partidoId = filas.find((partido) => partido.id)?.id;
    if (!partidoId) return;

    const resultado = await pedir(
      `/api/torneos/partidos/${partidoId}/resultado`,
      token,
      { method: "PUT", body: JSON.stringify({}) },
    );
    assert.equal(resultado.status, 403, mensaje(resultado.body));
    assert.match(mensaje(resultado.body), /solo aporta las instalaciones/);
  });
});
