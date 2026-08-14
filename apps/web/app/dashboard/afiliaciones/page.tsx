"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Loader2, Search, X } from "lucide-react";
import {
  AfiliacionesService,
  AfiliacionConRelaciones,
} from "@/utils/services/afiliaciones";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";

const ESTADO_FILTRO_OPTIONS = [
  { value: "pendiente", label: "Pendientes" },
  { value: "activo", label: "Activas" },
  { value: "rechazado", label: "Rechazadas" },
  { value: "todas", label: "Todas" },
] as const;

export default function AfiliacionesAdminPage() {
  const [rows, setRows] = useState<AfiliacionConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("pendiente");
  const [actingId, setActingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await AfiliacionesService.listarAdmin({
        estado: estadoFiltro === "todas" ? undefined : estadoFiltro,
        limit: 50,
        search: search || undefined,
      });
      setRows(data);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "No se pudieron cargar.";
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Error",
        description: msg,
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEstado = async (id: string, estado: "activo" | "rechazado") => {
    setActingId(id);
    try {
      await AfiliacionesService.cambiarEstado(id, estado);
      await load();
      setFeedback({
        isOpen: true,
        type: "success",
        title: estado === "activo" ? "Afiliación aprobada" : "Solicitud rechazada",
        description:
          estado === "activo"
            ? "El jugador ya figura afiliado al club."
            : "Se notificó al jugador del rechazo.",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      setFeedback({
        isOpen: true,
        type: "error",
        title: "No se pudo actualizar",
        description:
          apiError.response?.data?.error ||
          apiError.message ||
          "Error desconocido",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Afiliaciones
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Aprobá o rechazá solicitudes de jugadores para asociarse a un club.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI o club…"
            className="w-full bg-brand-card border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-chartreuse/40"
          />
        </div>
        <div className="w-full sm:w-56 shrink-0">
          <CustomDropdown
            value={estadoFiltro}
            onChange={setEstadoFiltro}
            options={ESTADO_FILTRO_OPTIONS}
            placeholder="Filtrar por estado"
            className="!py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="bg-brand-card border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-gray-400 gap-2">
            <Loader2 className="size-5 animate-spin" />
            Cargando…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay afiliaciones con ese filtro.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((row) => {
              const nombre = [
                row.perfiles?.apellido,
                row.perfiles?.nombre,
              ]
                .filter(Boolean)
                .join(", ");
              const esPendiente = (row.estado || "").toLowerCase() === "pendiente";

              return (
                <li
                  key={row.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {nombre || "Jugador"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {row.perfiles?.email || row.perfiles?.dni || "—"}
                    </p>
                    <p className="text-sm text-brand-chartreuse mt-2 flex items-center gap-1.5">
                      <Building2 className="size-3.5" />
                      {row.entidad || row.clubes?.nombre || "Club"}
                    </p>
                    <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10">
                      {row.estado}
                    </span>
                  </div>

                  {esPendiente && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={actingId === row.id}
                        onClick={() => handleEstado(row.id, "activo")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-chartreuse text-brand-black text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="size-3.5" />
                        Aprobar
                      </button>
                      <button
                        disabled={actingId === row.id}
                        onClick={() => handleEstado(row.id, "rechazado")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/20 text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        <X className="size-3.5" />
                        Rechazar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FeedbackModal {...feedback} />
    </div>
  );
}
