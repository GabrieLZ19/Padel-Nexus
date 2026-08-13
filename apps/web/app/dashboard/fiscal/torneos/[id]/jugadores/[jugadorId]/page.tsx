"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Shield, User } from "lucide-react";
import {
  FiscalPanelService,
  MOTIVOS_INFORME_LABELS,
  type FichaJugadorFiscal,
  type MotivoInformeFiscal,
  type PosicionJuegoFiscal,
} from "@/utils/services/fiscal-panel";
import { generarInformePreliminarPdf } from "@/utils/informePreliminarPdf";
import { NIVELES_PADEL } from "@/utils/constants/padelConfig";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal, {
  type FeedbackModalProps,
} from "@/components/ui/FeedbackModal";

export default function FichaJugadorFiscalPage() {
  const params = useParams();
  const router = useRouter();
  const torneoId = params?.id as string;
  const jugadorId = params?.jugadorId as string;

  const [ficha, setFicha] = useState<FichaJugadorFiscal | null>(null);
  const [torneoNombre, setTorneoNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [motivoInforme, setMotivoInforme] =
    useState<MotivoInformeFiscal>("categorizacion");
  const [posicion, setPosicion] = useState<PosicionJuegoFiscal | "">("");
  const [asociacion, setAsociacion] = useState("");
  const [categoriaSugerida, setCategoriaSugerida] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [motivoTraza, setMotivoTraza] = useState("");
  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
  });

  const cargar = useCallback(async () => {
    const [data, torneo] = await Promise.all([
      FiscalPanelService.getJugador(jugadorId),
      FiscalPanelService.getTorneo(torneoId).catch(() => null),
    ]);
    setFicha(data);
    setTorneoNombre(torneo?.nombre || "");
    setAsociacion(data.asociacion_o_club || data.lugar_residencia || "");
    setCategoriaSugerida(data.categoria_padel || "");
  }, [jugadorId, torneoId]);

  useEffect(() => {
    let mounted = true;
    const defer = setTimeout(() => {
      cargar()
        .catch(() => {
          if (mounted) {
            setFeedback({
              isOpen: true,
              title: "Sin acceso",
              description: "Este jugador no está en un torneo asignado a tu ficha.",
              type: "error",
              onClose: () => router.push(`/dashboard/fiscal/torneos/${torneoId}`),
            });
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(defer);
    };
  }, [cargar, router, torneoId]);

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ficha) return;
    setSaving(true);
    try {
      const informe = await FiscalPanelService.crearInforme(torneoId, {
        jugador_id: ficha.id,
        motivo_informe: motivoInforme,
        posicion_juego: posicion || null,
        asociacion_jugador: asociacion || null,
        categoria_nueva:
          motivoInforme === "categorizacion" ? categoriaSugerida || null : null,
        descripcion: cuerpo,
        motivo: motivoTraza || MOTIVOS_INFORME_LABELS[motivoInforme],
      });

      const torneo = await FiscalPanelService.getTorneo(torneoId);
      generarInformePreliminarPdf({
        torneo,
        jugador: ficha,
        informe,
        fiscalNombre: "Fiscal actuante",
      });

      setCuerpo("");
      setMotivoTraza("");
      await cargar();
      setFeedback({
        isOpen: true,
        title: "Informe preliminar emitido",
        description:
          "Quedó registrado como interno y se descargó el PDF. El Fiscal General fue notificado si corresponde.",
        type: "success",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo guardar.";
      setFeedback({
        isOpen: true,
        title: "Error",
        description: message,
        type: "error",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ficha) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-40 bg-[#151515] rounded-2xl border border-white/5" />
      </div>
    );
  }

  const licencia = ficha.licencias?.find((l) => l.estado === "Activa") || ficha.licencias?.[0];

  return (
    <div className="w-full max-w-full mx-auto px-4 py-6 md:px-10 md:py-10 space-y-6">
      <button
        type="button"
        onClick={() => router.push(`/dashboard/fiscal/torneos/${torneoId}`)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"
      >
        <ArrowLeft className="size-4" /> Volver al torneo
      </button>

      <div className="bg-[#161616] border border-white/5 rounded-3xl p-6 md:p-8">
        <p className="text-brand-chartreuse text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
          <Shield className="size-4" /> Ficha visible para fiscal
        </p>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <User className="size-7 text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              {[ficha.apellido, ficha.nombre].filter(Boolean).join(", ")}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              DNI {ficha.dni || "No registrado"} · {ficha.lugar_residencia || "Sin residencia"}
            </p>
            {torneoNombre ? (
              <p className="text-xs text-gray-500 mt-1">{torneoNombre}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
          <Dato label="Categoría" value={ficha.categoria_padel || "S/C"} />
          <Dato label="Carnet / licencia" value={licencia?.estado || "Sin carnet"} />
          <Dato label="N° carnet" value={licencia?.nro_licencia || "—"} />
          <Dato
            label="Asociación / club"
            value={ficha.asociacion_o_club || ficha.lugar_residencia || "—"}
          />
        </div>
      </div>

      <form
        onSubmit={handleEmitir}
        className="bg-[#151515] border border-white/5 rounded-2xl p-5 space-y-4"
      >
        <h2 className="font-bold text-white flex items-center gap-2">
          <Download className="size-4 text-brand-chartreuse" />
          Emitir informe preliminar
        </h2>
        <p className="text-xs text-gray-500">
          Documento interno para el Fiscal General. No se comunica al jugador durante la
          competencia y no modifica su perfil público.
        </p>

        <CustomDropdown
          value={motivoInforme}
          onChange={(v) => setMotivoInforme(v as MotivoInformeFiscal)}
          options={Object.entries(MOTIVOS_INFORME_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          placeholder="Motivo del informe"
        />

        <CustomDropdown
          value={posicion}
          onChange={(v) => setPosicion(v as PosicionJuegoFiscal | "")}
          options={[
            { value: "", label: "Posición (opcional)" },
            { value: "drive", label: "Drive" },
            { value: "reves", label: "Revés" },
          ]}
          placeholder="Posición de juego"
        />

        <input
          value={asociacion}
          onChange={(e) => setAsociacion(e.target.value)}
          placeholder="Asociación / Agrupación"
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
        />

        {motivoInforme === "categorizacion" && (
          <CustomDropdown
            value={categoriaSugerida}
            onChange={setCategoriaSugerida}
            options={NIVELES_PADEL.map((n) => ({ value: n.value, label: n.label }))}
            placeholder="Categoría sugerida (recomendación)"
          />
        )}

        <textarea
          required
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          placeholder="Observaciones del informe"
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white min-h-24"
        />
        <textarea
          required
          value={motivoTraza}
          onChange={(e) => setMotivoTraza(e.target.value)}
          placeholder="Motivo / traza breve (auditoría)"
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white min-h-16"
        />

        <button
          type="submit"
          disabled={saving}
          className="bg-brand-chartreuse text-brand-black font-bold px-5 py-3 rounded-xl text-sm cursor-pointer disabled:opacity-60"
        >
          {saving ? "Emitiendo…" : "Emitir informe y descargar PDF"}
        </button>
      </form>

      {ficha.incidencias && ficha.incidencias.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-white text-sm">Historial de informes</h2>
          {ficha.incidencias.map((inc) => (
            <div
              key={inc.id}
              className="bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300"
            >
              <span className="text-brand-chartreuse font-bold uppercase text-[10px] tracking-widest">
                {inc.motivo_informe
                  ? MOTIVOS_INFORME_LABELS[inc.motivo_informe]
                  : inc.tipo}{" "}
                · {inc.estado}
              </span>
              <p className="mt-1">{inc.descripcion}</p>
              {inc.motivo ? (
                <p className="mt-1 text-xs text-gray-500">Traza: {inc.motivo}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <FeedbackModal {...feedback} />
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-xl px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</p>
      <p className="text-white font-semibold mt-1">{value}</p>
    </div>
  );
}
