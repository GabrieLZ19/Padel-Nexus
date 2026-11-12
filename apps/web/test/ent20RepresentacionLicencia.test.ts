import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type LicStub = {
  id: string;
  usuario_id: string;
  nro_licencia: string;
  estado: string;
  asociacion_id?: string | null;
  asociaciones?: { id: string; nombre: string; sigla?: string | null };
  fecha_vencimiento?: string;
};

type AfStub = {
  id: string;
  usuario_id: string;
  entidad: string;
  estado: string;
  fecha_vencimiento: string;
  asociacion_id?: string | null;
  asociaciones?: { id: string; nombre: string; sigla?: string | null };
};

function afiliacionVisible(estado?: string | null): boolean {
  const e = (estado || "").toLowerCase();
  return e !== "suspendido" && e !== "rechazado" && e !== "baja";
}

/** Espejo de representacionesProvincialMiPerfil para tests sin loader TS. */
function representacionesProvincialMiPerfil(params: {
  afiliaciones?: AfStub[] | null;
  licencias?: LicStub | LicStub[] | null;
}) {
  const porAfiliacion = (params.afiliaciones ?? []).filter((af) =>
    afiliacionVisible(af.estado),
  );
  if (porAfiliacion.length > 0) return porAfiliacion;

  const licList = Array.isArray(params.licencias)
    ? params.licencias
    : params.licencias
      ? [params.licencias]
      : [];
  const vistos = new Set<string>();
  const desdeLicencia: Array<AfStub & { desde_licencia?: boolean }> = [];

  for (const lic of licList) {
    const estado = (lic.estado || "").toLowerCase();
    if (estado !== "activa" && estado !== "pendiente") continue;
    const asoc = lic.asociaciones;
    const asocId = lic.asociacion_id ?? asoc?.id ?? null;
    if (!asocId || vistos.has(asocId)) continue;
    vistos.add(asocId);
    desdeLicencia.push({
      id: `licencia-${lic.id}`,
      usuario_id: lic.usuario_id,
      entidad: asoc?.nombre?.trim() || "",
      estado: lic.estado,
      fecha_vencimiento: lic.fecha_vencimiento || "",
      asociacion_id: asocId,
      asociaciones: asoc,
      desde_licencia: true,
    });
  }
  return desdeLicencia;
}

describe("ENT-20 · representación provincial desde licencia", () => {
  it("usa asociación de licencia activa sin afiliación", () => {
    const items = representacionesProvincialMiPerfil({
      afiliaciones: [],
      licencias: [
        {
          id: "lic-1",
          usuario_id: "u1",
          nro_licencia: "PAD-V5O908",
          estado: "Activa",
          asociacion_id: "asoc-neu",
          asociaciones: {
            id: "asoc-neu",
            nombre: "Asociación de Pádel del Neuquén",
            sigla: "APN",
          },
        },
      ],
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]?.desde_licencia, true);
    assert.equal(items[0]?.asociaciones?.sigla, "APN");
  });

  it("prioriza afiliaciones cuando existen", () => {
    const items = representacionesProvincialMiPerfil({
      afiliaciones: [
        {
          id: "af-1",
          usuario_id: "u1",
          entidad: "Club X",
          estado: "Activo",
          fecha_vencimiento: "2026-12-31",
          asociacion_id: "asoc-1",
          asociaciones: { id: "asoc-1", nombre: "APN", sigla: "APN" },
        },
      ],
      licencias: [
        {
          id: "lic-1",
          usuario_id: "u1",
          nro_licencia: "PAD-1",
          estado: "Activa",
          asociacion_id: "asoc-otra",
          asociaciones: {
            id: "asoc-otra",
            nombre: "Otra",
            sigla: "OTR",
          },
        },
      ],
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, "af-1");
    assert.equal(items[0]?.desde_licencia, undefined);
  });

  it("mi-perfil usa representacionesProvincialMiPerfil", () => {
    const perfil = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/page.tsx"),
      "utf8",
    );
    assert.match(perfil, /representacionesProvincialMiPerfil/);
    assert.match(perfil, /Según tu licencia activa/);
  });

  it("perfil API incluye join de asociación en licencias", () => {
    const svc = readFileSync(
      path.join(RAIZ, "../api/src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(svc, /licencias!fk_licencias_usuario\(\*, asociaciones:asociacion_id/);
  });
});
