"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { sileo } from "sileo";
import { MenoresService } from "@/utils/services/menores";

function renderMarkdownLite(md: string): string {
  return md
    .replace(/^### (.*$)/gm, "<h3 class='text-base font-bold text-brand-white mt-4 mb-1'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='text-lg font-bold text-brand-white mt-5 mb-2'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='text-xl font-black text-brand-white mt-2 mb-2'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-white'>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p class='mt-2'>")
    .replace(/\n/g, "<br/>");
}

export default function ConsentimientoParentalPage() {
  const params = useParams();
  const token = String(params.token || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const [declara, setDeclara] = useState(false);
  const [esencial, setEsencial] = useState(false);
  const [privacidad, setPrivacidad] = useState(false);
  const [perfilPublico, setPerfilPublico] = useState(false);
  const [comercial, setComercial] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await MenoresService.getConsentimientoPorToken(token);
        if (cancelled) return;
        setData(res);
        if (res.estado === "ya_verificado") setDone(true);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el enlace de consentimiento.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declara || !esencial || !privacidad) {
      sileo.error({
        title: "Completá las declaraciones obligatorias.",
      });
      return;
    }
    setSaving(true);
    try {
      await MenoresService.confirmarConsentimiento(token, {
        declara_representacion: declara,
        consentimiento_esencial: esencial,
        leyo_privacidad_menores: privacidad,
        autoriza_perfil_publico: perfilPublico,
        autoriza_comunicaciones_comerciales: comercial,
      });
      setDone(true);
      sileo.success({ title: "Consentimiento registrado." });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo confirmar el consentimiento.";
      sileo.error({ title: msg });
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-gray-400">
        Validando enlace…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-red-400">{error}</div>
    );
  }

  const jugador = data?.jugador as
    | { nombre?: string; apellido?: string; edad_aprox?: number }
    | undefined;
  const docs = data?.documentos as
    | {
        consentimiento_parental?: { contenido_md?: string; version?: string };
        privacidad_menores?: { version?: string };
      }
    | undefined;

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-brand-white">
        <h1 className="mb-4 text-3xl font-extrabold">Cuenta protegida activada</h1>
        <p className="mb-6 text-gray-300">
          El modo de protección para menores quedó activo. Las autorizaciones
          pueden revisarse o revocarse desde la cuenta del responsable.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-xl bg-brand-chartreuse px-5 py-3 font-bold text-brand-black"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-brand-white">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-chartreuse">
        Consentimiento parental
      </p>
      <h1 className="mb-2 text-3xl font-extrabold">
        Consentimiento para cuenta de jugador/a menor de edad
      </h1>
      <p className="mb-6 text-sm text-gray-400">
        Jugador/a:{" "}
        <strong className="text-brand-white">
          {jugador?.nombre} {jugador?.apellido}
        </strong>
        {jugador?.edad_aprox != null ? ` · ${jugador.edad_aprox} años` : ""}
      </p>

      <div
        className="mb-8 max-h-72 overflow-y-auto rounded-xl border border-brand-white/10 bg-brand-input/40 p-5 text-sm leading-relaxed text-gray-300"
        dangerouslySetInnerHTML={{
          __html: `<p>${renderMarkdownLite(docs?.consentimiento_parental?.contenido_md || "Texto de consentimiento no disponible.")}</p>`,
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-start gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={declara}
            onChange={(e) => setDeclara(e.target.checked)}
            className="mt-1"
          />
          <span>
            [Obligatorio] Declaro que ejerzo responsabilidad parental, tutela,
            guarda o representación suficiente respecto del jugador/a menor
            identificado/a y que los datos proporcionados son verdaderos.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={esencial}
            onChange={(e) => setEsencial(e.target.checked)}
            className="mt-1"
          />
          <span>
            [Obligatorio] Presto consentimiento para el tratamiento de los datos
            necesarios para la cuenta y la actividad deportiva del jugador/a
            menor en PADEL NEXUS.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={privacidad}
            onChange={(e) => setPrivacidad(e.target.checked)}
            className="mt-1"
          />
          <span>
            [Obligatorio] Declaro haber leído o tenido acceso a la{" "}
            <Link
              href="/privacidad-menores"
              className="text-brand-chartreuse underline"
              target="_blank"
            >
              Política de Privacidad para Jugadores Menores
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={perfilPublico}
            onChange={(e) => setPerfilPublico(e.target.checked)}
            className="mt-1"
          />
          <span>
            [Opcional] Autorizo el perfil deportivo público (nombre, apellido,
            categoría, ranking, resultados y estadísticas). No incluye
            fotografía ni datos de contacto.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={comercial}
            onChange={(e) => setComercial(e.target.checked)}
            className="mt-1"
          />
          <span>
            [Opcional] Autorizo el envío de comunicaciones comerciales (promociones, novedades sobre sponsors o marketplace de Padel Nexus).
          </span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-brand-chartreuse py-3.5 font-bold text-brand-black disabled:opacity-60"
        >
          {saving ? "Registrando…" : "Confirmar consentimiento"}
        </button>
      </form>
    </div>
  );
}
