"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldX, Loader2, IdCard } from "lucide-react";
import {
  SitioPublicoService,
  type VerificacionLicenciaPublica,
} from "@/utils/services/sitioPublico";

const ESTADO_UI: Record<
  VerificacionLicenciaPublica["estado"],
  { label: string; clase: string }
> = {
  activa: {
    label: "Vigente",
    clase: "border-green-500/40 bg-green-500/10 text-green-400",
  },
  vencida: {
    label: "Vencida",
    clase: "border-red-500/40 bg-red-500/10 text-red-400",
  },
  suspendida: {
    label: "Suspendida",
    clase: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  },
  en_tramite: {
    label: "En trámite",
    clase: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  no_valida: {
    label: "No válida",
    clase: "border-white/15 bg-white/5 text-gray-400",
  },
};

export default function VerificarCredencialPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const usuarioId = String(params.usuarioId || "");
  const licenciaId = searchParams.get("licencia");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dato, setDato] = useState<VerificacionLicenciaPublica | null>(null);

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setError("Enlace de verificación incompleto.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await SitioPublicoService.verificarLicencia(
        usuarioId,
        licenciaId,
      );
      setDato(res);
    } catch {
      setError("No pudimos verificar el carné en este momento.");
      setDato(null);
    } finally {
      setLoading(false);
    }
  }, [usuarioId, licenciaId]);

  useEffect(() => {
    const t = setTimeout(() => {
      void cargar();
    }, 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const estadoUi = dato ? ESTADO_UI[dato.estado] : ESTADO_UI.no_valida;

  return (
    <main className="max-w-lg mx-auto px-4 py-10 md:py-16">
      <div className="text-center mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-chartreuse mb-2">
          Credencial digital
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Verificación de carné
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Resultado oficial para control en sede o torneo.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-brand-card/80 p-6 md:p-8 shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-brand-chartreuse">
            <Loader2 className="size-10 animate-spin" />
            <p className="text-sm font-semibold text-gray-300">
              Consultando registro...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldX className="size-12 text-red-400" />
            <p className="text-red-300 text-sm font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => void cargar()}
              className="text-sm font-bold text-brand-chartreuse hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : dato ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              {dato.valida ? (
                <ShieldCheck className="size-14 text-green-400" />
              ) : dato.estado === "en_tramite" ? (
                <ShieldCheck className="size-14 text-amber-300" />
              ) : (
                <ShieldX className="size-14 text-gray-400" />
              )}
              <span
                className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${estadoUi.clase}`}
              >
                {estadoUi.label}
              </span>
              {dato.mensaje ? (
                <p className="text-sm text-gray-300 text-center">{dato.mensaje}</p>
              ) : null}
            </div>

            <dl className="space-y-4 border-t border-white/10 pt-6">
              {dato.titular ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    Titular
                  </dt>
                  <dd className="text-lg font-semibold text-white mt-1">
                    {dato.titular}
                  </dd>
                </div>
              ) : null}

              {dato.dni_parcial ? (
                <div className="flex items-start gap-3">
                  <IdCard className="size-5 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                      DNI
                    </dt>
                    <dd className="text-base font-semibold text-white mt-1">
                      {dato.dni_parcial}
                    </dd>
                  </div>
                </div>
              ) : null}

              {dato.nro_licencia ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    N.º de licencia
                  </dt>
                  <dd className="text-base font-mono font-semibold text-brand-chartreuse mt-1">
                    {dato.nro_licencia}
                  </dd>
                </div>
              ) : null}

              {dato.fecha_vencimiento_texto ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    Vencimiento
                  </dt>
                  <dd className="text-base font-semibold text-white mt-1">
                    {dato.fecha_vencimiento_texto}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-gray-500 mt-8">
        <Link href="/" className="text-brand-chartreuse font-semibold hover:underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
