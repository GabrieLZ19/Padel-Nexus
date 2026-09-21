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
import { LicenciaPagosHistorial } from "./LicenciaPagosHistorial";

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
    <article className="bg-[#111111] border border-white/5 rounded-2xl p-4 lg:p-5 hover:border-white/10 transition-colors overflow-hidden">
      {/*
        Flex + wrap: si hay espacio (monitor amplio @100%) queda en una fila;
        si el zoom/columna aprieta, vencimiento y acciones bajan sin truncar el nombre.
      */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3.5 min-w-0">
        <div className="flex items-center gap-3.5 min-w-0 flex-1 basis-[min(100%,280px)]">
          <div className="size-11 rounded-full bg-brand-card border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
            <User className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white break-words [overflow-wrap:anywhere]">
                {nombreCompleto}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${estado.bg} ${estado.border} ${estado.text}`}
              >
                <span className={`size-1.5 rounded-full ${estado.dot}`} />
                {estado.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 break-all mt-0.5">
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
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-mono bg-black/30 px-2 py-0.5 rounded-md">
                <Hash className="size-3" />
                {licencia.nro_licencia}
                {jugador.licencias && jugador.licencias.length > 1 && (
                  <span className="text-[10px] text-brand-chartreuse font-bold">
                    ×{jugador.licencias.length}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[200px] sm:max-w-[260px] sm:flex-1 min-[1600px]:flex-none min-[1600px]:w-60">
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

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto shrink-0">
          {licencia.estado === "Pendiente" ? (
            <button
              type="button"
              onClick={onValidar}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-black px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(204,255,0,0.12)]"
            >
              <ShieldCheck className="size-4" />
              Validar solicitud
            </button>
          ) : licencia.estado === "Activa" ? (
            <button
              type="button"
              onClick={() => onCambiarEstado(licencia.id, "Suspendida")}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              <Ban className="size-4" />
              Revocar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCambiarEstado(licencia.id, "Activa")}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-brand-chartreuse/30 bg-brand-chartreuse/10 text-brand-chartreuse hover:bg-brand-chartreuse hover:text-brand-black transition-colors"
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

      {licencia.estado !== "Pendiente" && (
        <LicenciaPagosHistorial licenciaId={licencia.id} />
      )}
    </article>
  );
}
