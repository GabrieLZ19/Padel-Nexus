"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Licencia, Perfil } from "@/utils/types";
import { LicenciaVencimientoEditor } from "./LicenciaVencimientoEditor";
import { LicenciaPagosHistorial } from "./LicenciaPagosHistorial";
import { MenuPuntos, type ItemMenuPuntos } from "@/components/ui/MenuPuntos";
import { etiquetaCategoria } from "@/utils/etiquetaCategoria";
import { ALTO_FILA_JUGADOR_PX } from "@/utils/jugadoresListado";

interface LicenciaJugadorCardProps {
  jugador: Perfil;
  licencia: Licencia;
  presentacion?: "fila" | "tarjeta";
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
  { label: string; clase: string }
> = {
  Activa: {
    label: "Vigente",
    clase: "border-green-500/30 bg-green-500/10 text-green-400",
  },
  Pendiente: {
    label: "Por validar",
    clase: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  },
  Vencida: {
    label: "Vencida",
    clase: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  Suspendida: {
    label: "Rechazada",
    clase: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  },
};

function iniciales(jugador: Perfil): string {
  const letras = `${jugador.apellido || ""}${jugador.nombre || ""}`
    .trim()
    .slice(0, 2)
    .toUpperCase();
  return letras || "·";
}

export function LicenciaJugadorCard({
  jugador,
  licencia,
  presentacion = "fila",
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
  const router = useRouter();
  const [pagosAbiertos, setPagosAbiertos] = useState(false);
  const estado = ESTADO_STYLES[licencia.estado] || ESTADO_STYLES.Activa;
  const nombreCompleto = jugador.nombre
    ? `${jugador.apellido?.toUpperCase()}, ${jugador.nombre}`
    : "Sin nombre";
  const isEditing = editingLicenciaId === licencia.id;
  const categoria = etiquetaCategoria(jugador.categoria_padel) || "—";
  const licenciaExtra =
    jugador.licencias && jugador.licencias.length > 1
      ? ` ×${jugador.licencias.length}`
      : "";

  const menu: ItemMenuPuntos[] = [
    {
      label: "Ver perfil",
      onSelect: () => router.push(`/dashboard/jugadores/${jugador.id}`),
    },
    ...(licencia.estado !== "Pendiente"
      ? [
          {
            label: "Pagos",
            onSelect: () => setPagosAbiertos((abierto) => !abierto),
          },
        ]
      : []),
    ...(licencia.estado === "Activa"
      ? [
          {
            label: "Revocar",
            danger: true,
            onSelect: () => onCambiarEstado(licencia.id, "Suspendida"),
          },
        ]
      : []),
  ];

  const vencimiento = (
    <LicenciaVencimientoEditor
      compact
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
  );

  const acciones = (
    <div className="flex items-center justify-end gap-1">
      {licencia.estado === "Pendiente" ? (
        <button
          type="button"
          onClick={onValidar}
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-brand-chartreuse px-2 text-xs font-bold text-brand-black hover:bg-[#b3e600]"
        >
          <ShieldCheck className="size-3.5" />
          Validar
        </button>
      ) : licencia.estado !== "Activa" ? (
        <button
          type="button"
          onClick={() => onCambiarEstado(licencia.id, "Activa")}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-brand-chartreuse/30 bg-brand-chartreuse/10 px-2 text-xs font-bold text-brand-chartreuse hover:bg-brand-chartreuse hover:text-brand-black"
        >
          <ShieldCheck className="size-3.5" />
          Reactivar
        </button>
      ) : null}
      <MenuPuntos
        etiqueta={`Más acciones de ${nombreCompleto}`}
        items={menu}
      />
    </div>
  );

  const insignia = (
    <span
      className={`inline-flex h-5 items-center rounded-full border px-2 text-xs font-semibold ${estado.clase}`}
    >
      {estado.label}
    </span>
  );

  if (presentacion === "tarjeta") {
    return (
      <article className="rounded-2xl border border-white/10 bg-[#141414] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-chartreuse/20 bg-brand-chartreuse/10 text-xs font-black text-brand-chartreuse">
            {iniciales(jugador)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">
                {nombreCompleto}
              </h3>
              {insignia}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              DNI {jugador.dni || "—"} · {categoria} · {licencia.nro_licencia}
              {licenciaExtra}
            </p>
          </div>
          {acciones}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-2.5">
          <span className="text-xs text-gray-500">Vencimiento</span>
          {vencimiento}
        </div>
        {pagosAbiertos ? (
          <LicenciaPagosHistorial licenciaId={licencia.id} siempreAbierto />
        ) : null}
      </article>
    );
  }

  return (
    <>
      <tr
        data-fila-jugador=""
        style={{ height: ALTO_FILA_JUGADOR_PX }}
        className="border-b border-white/5 odd:bg-black/20 hover:bg-white/5"
      >
        <td className="px-3 py-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-chartreuse/10 text-[11px] font-black text-brand-chartreuse">
              {iniciales(jugador)}
            </span>
            <p className="truncate text-xs font-semibold text-white">
              {nombreCompleto}
            </p>
          </div>
        </td>
        <td className="px-3 py-0 font-mono text-xs tabular-nums text-gray-200">
          {jugador.dni || "—"}
        </td>
        <td className="px-3 py-0">
          <span className="inline-flex h-5 items-center rounded-md bg-brand-chartreuse/10 px-1.5 text-xs font-semibold text-brand-chartreuse">
            {categoria}
          </span>
        </td>
        <td className="px-3 py-0 font-mono text-xs text-gray-200">
          {licencia.nro_licencia}
          {licenciaExtra}
        </td>
        <td className="px-3 py-0">{insignia}</td>
        <td className="px-3 py-0">{vencimiento}</td>
        <td className="px-3 py-0">{acciones}</td>
      </tr>
      {pagosAbiertos ? (
        <tr className="border-b border-white/5 bg-black/20">
          <td colSpan={7} className="px-0 py-0">
            <LicenciaPagosHistorial licenciaId={licencia.id} siempreAbierto />
          </td>
        </tr>
      ) : null}
    </>
  );
}
