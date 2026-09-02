"use client";

import Link from "next/link";
import {
  User,
  ShieldCheck,
  Ban,
  ExternalLink,
  Hash,
  IdCard,
} from "lucide-react";
import { Licencia, Perfil } from "@/utils/types";
import { LicenciaVencimientoEditor } from "./LicenciaVencimientoEditor";

interface LicenciaJugadorCardProps {
  jugador: Perfil;
  licencia: Licencia;
  editingLicenciaId: string | null;
  editingFechaInput: string;
  onStartEditFecha: (licenciaId: string, fecha: string) => void;
  onChangeFecha: (value: string) => void;
  onSaveFecha: (licenciaId: string, estado: string) => void;
  onCancelEditFecha: () => void;
  onValidar: () => void;
  onCambiarEstado: (licenciaId: string, estado: "Activa" | "Suspendida") => void;
  savingFecha?: boolean;
}

const ESTADO_STYLES: Record<
  string,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  Activa: {
    label: "Vigente",
    dot: "bg-green-500",
    text: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  Pendiente: {
    label: "Por validar",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  Vencida: {
    label: "Vencida",
    dot: "bg-red-500",
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  Suspendida: {
    label: "Rechazada",
    dot: "bg-orange-500",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
};

export function LicenciaJugadorCard({
  jugador,
  licencia,
  editingLicenciaId,
  editingFechaInput,
  onStartEditFecha,
  onChangeFecha,
  onSaveFecha,
  onCancelEditFecha,
  onValidar,
  onCambiarEstado,
  savingFecha,
}: LicenciaJugadorCardProps) {
  const estado = ESTADO_STYLES[licencia.estado] || ESTADO_STYLES.Activa;
  const nombreCompleto = jugador.nombre
    ? `${jugador.apellido?.toUpperCase()}, ${jugador.nombre}`
    : "Sin nombre";
  const isEditing = editingLicenciaId === licencia.id;

  return (
    <article className="bg-[#111111] border border-white/5 rounded-2xl p-4 lg:p-5 hover:border-white/10 transition-colors">
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-6">
        {/* Jugador */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="size-11 rounded-full bg-brand-card border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
            <User className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate">{nombreCompleto}</h3>
            <p className="text-xs text-gray-500 truncate">
              {jugador.email || "Sin email"}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-mono bg-black/30 px-2 py-0.5 rounded-md">
                <IdCard className="size-3" />
                {jugador.dni || "—"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-black/30 px-2 py-0.5 rounded-md">
                Cat. {jugador.categoria_padel || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Licencia + estado */}
        <div className="flex flex-wrap items-center gap-3 xl:w-auto">
          <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-xl px-3 py-2">
            <Hash className="size-3.5 text-gray-500" />
            <span className="text-sm font-mono font-semibold text-gray-300">
              {licencia.nro_licencia}
            </span>
            {jugador.licencias && jugador.licencias.length > 1 && (
              <span className="text-[10px] bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/25 px-1.5 py-0.5 rounded font-bold">
                ×{jugador.licencias.length}
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${estado.bg} ${estado.border} ${estado.text}`}
          >
            <span className={`size-2 rounded-full ${estado.dot}`} />
            {estado.label}
          </span>
        </div>

        {/* Vencimiento editable */}
        <div className="xl:w-56 shrink-0">
          <LicenciaVencimientoEditor
            fechaVencimiento={licencia.fecha_vencimiento}
            editable={licencia.estado !== "Pendiente"}
            isEditing={isEditing}
            editingValue={editingFechaInput}
            onStartEdit={() =>
              onStartEditFecha(
                licencia.id,
                licencia.fecha_vencimiento
                  ? licencia.fecha_vencimiento.split("T")[0]
                  : "",
              )
            }
            onChange={onChangeFecha}
            onSave={() => onSaveFecha(licencia.id, licencia.estado)}
            onCancel={onCancelEditFecha}
            saving={savingFecha}
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 xl:shrink-0">
          {licencia.estado === "Pendiente" ? (
            <button
              type="button"
              onClick={onValidar}
              className="flex-1 xl:flex-none inline-flex items-center justify-center gap-2 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-black px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(204,255,0,0.12)]"
            >
              <ShieldCheck className="size-4" />
              Validar solicitud
            </button>
          ) : licencia.estado === "Activa" ? (
            <button
              type="button"
              onClick={() => onCambiarEstado(licencia.id, "Suspendida")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              <Ban className="size-4" />
              Revocar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCambiarEstado(licencia.id, "Activa")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-brand-chartreuse/30 bg-brand-chartreuse/10 text-brand-chartreuse hover:bg-brand-chartreuse hover:text-brand-black transition-colors"
            >
              <ShieldCheck className="size-4" />
              Reactivar
            </button>
          )}

          <Link
            href={`/dashboard/jugadores/${jugador.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Ver perfil completo"
          >
            <ExternalLink className="size-3.5" />
            <span className="hidden sm:inline">Perfil</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
