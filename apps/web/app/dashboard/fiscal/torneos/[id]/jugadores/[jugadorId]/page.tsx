"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Shield, User } from "lucide-react";
import {
  FiscalPanelService,
  type FichaJugadorFiscal,
} from "@/utils/services/fiscal-panel";
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
  const [loading, setLoading] = useState(true);
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [motivoCategoria, setMotivoCategoria] = useState("");
  const [descDescali, setDescDescali] = useState("");
  const [motivoDescali, setMotivoDescali] = useState("");
  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
  });

  const cargar = useCallback(async () => {
    const data = await FiscalPanelService.getJugador(jugadorId);
    setFicha(data);
    setCategoriaNueva(data.categoria_padel || "");
  }, [jugadorId]);

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

  const handleCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ficha) return;
    setSaving(true);
    try {
      await FiscalPanelService.registrarIncidencia(torneoId, {
        tipo: "cambio_categoria",
        jugador_id: ficha.id,
        categoria_nueva: categoriaNueva,
        descripcion: `Cambio de categoría de ${ficha.categoria_padel || "S/C"} a ${categoriaNueva}`,
        motivo: motivoCategoria,
      });
      setMotivoCategoria("");
      await cargar();
      setFeedback({
        isOpen: true,
        title: "Categoría actualizada",
        description: "El cambio quedó aplicado en la ficha y auditado.",
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

  const handleDescalificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ficha) return;
    setSaving(true);
    try {
      await FiscalPanelService.registrarIncidencia(torneoId, {
        tipo: "descalificacion",
        jugador_id: ficha.id,
        descripcion: descDescali,
        motivo: motivoDescali,
      });
      setDescDescali("");
      setMotivoDescali("");
      await cargar();
      setFeedback({
        isOpen: true,
        title: "Descalificación registrada",
        description:
          "Quedó en el acta. No se aplica sola al cuadro hasta confirmarlo con la federación.",
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
    <div className="w-full max-w-3xl mx-auto px-4 py-6 md:px-10 md:py-10 space-y-6">
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
          <Dato label="Categoría" value={ficha.categoria_padel || "S/C"} />
          <Dato label="Carnet / licencia" value={licencia?.estado || "Sin carnet"} />
          <Dato label="N° carnet" value={licencia?.nro_licencia || "—"} />
          <Dato
            label="Vencimiento"
            value={licencia?.fecha_vencimiento?.split("T")[0] || "—"}
          />
        </div>
      </div>

      <form
        onSubmit={handleCategoria}
        className="bg-[#151515] border border-white/5 rounded-2xl p-5 space-y-4"
      >
        <h2 className="font-bold text-white">Cambio de categoría</h2>
        <p className="text-xs text-gray-500">
          Se aplica en la ficha del jugador y queda auditado con motivo.
        </p>
        <CustomDropdown
          value={categoriaNueva}
          onChange={setCategoriaNueva}
          options={NIVELES_PADEL.map((n) => ({ value: n.value, label: n.label }))}
          placeholder="Nueva categoría"
        />
        <textarea
          required
          value={motivoCategoria}
          onChange={(e) => setMotivoCategoria(e.target.value)}
          placeholder="Motivo del cambio"
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white min-h-20"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-chartreuse text-brand-black font-bold px-5 py-3 rounded-xl text-sm cursor-pointer disabled:opacity-60"
        >
          Aplicar cambio
        </button>
      </form>

      <form
        onSubmit={handleDescalificacion}
        className="bg-[#151515] border border-white/5 rounded-2xl p-5 space-y-4"
      >
        <h2 className="font-bold text-white">Descalificación</h2>
        <p className="text-xs text-gray-500">
          Solo se registra en el acta. No saca al jugador del cuadro hasta
          confirmar el criterio con la federación.
        </p>
        <textarea
          required
          value={descDescali}
          onChange={(e) => setDescDescali(e.target.value)}
          placeholder="Hecho / fundamento"
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white min-h-20"
        />
        <textarea
          required
          value={motivoDescali}
          onChange={(e) => setMotivoDescali(e.target.value)}
          placeholder="Motivo (trazable)"
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white min-h-20"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-red-500/15 text-red-400 border border-red-500/20 font-bold px-5 py-3 rounded-xl text-sm cursor-pointer disabled:opacity-60"
        >
          Registrar descalificación
        </button>
      </form>

      {ficha.incidencias && ficha.incidencias.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-white text-sm">Historial en actas</h2>
          {ficha.incidencias.map((inc) => (
            <div
              key={inc.id}
              className="bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300"
            >
              <span className="text-brand-chartreuse font-bold uppercase text-[10px] tracking-widest">
                {inc.tipo}
              </span>
              <p className="mt-1">{inc.descripcion}</p>
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
