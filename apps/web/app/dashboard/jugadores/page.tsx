"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Settings2,
  Users,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LicenciasService } from "@/utils/services/licencias";
import { ClubesService } from "@/utils/services/clubes";
import { Licencia, Perfil } from "@/utils/types";
import FeedbackModal from "@/components/ui/FeedbackModal";
import Pagination from "@/components/ui/Pagination";
import { ConfigLicenciasPanel } from "@/components/licencias/ConfigLicenciasPanel";
import { LicenciaJugadorCard } from "@/components/licencias/LicenciaJugadorCard";

const PAGE_SIZE = 8;

type MobileTab = "licencias" | "config";
type FiltroLicencia =
  | "Todas"
  | "Pendientes"
  | "Vigentes"
  | "Vencidas"
  | "Rechazadas";

const FILTROS: FiltroLicencia[] = [
  "Todas",
  "Pendientes",
  "Vigentes",
  "Vencidas",
  "Rechazadas",
];

const FILTRO_A_ESTADO: Record<
  FiltroLicencia,
  Licencia["estado"] | undefined
> = {
  Todas: undefined,
  Pendientes: "Pendiente",
  Vigentes: "Activa",
  Vencidas: "Vencida",
  Rechazadas: "Suspendida",
};

const getDisplayLicencia = (licList?: Licencia[]) => {
  if (!licList || licList.length === 0) return null;
  const pending = licList.find((l) => l.estado === "Pendiente");
  if (pending) return pending;
  const active = licList.find((l) => l.estado === "Activa");
  if (active) return active;
  const vencida = licList.find((l) => l.estado === "Vencida");
  if (vencida) return vencida;
  return licList[0];
};

function contarPorEstado(items: Perfil[], estado: Licencia["estado"]) {
  return items.filter((j) =>
    j.licencias?.some((l) => l.estado === estado),
  ).length;
}

export default function JugadoresLicenciasPage() {
  const [licencias, setLicencias] = useState<Perfil[]>([]);
  const [clubes, setClubes] = useState<{ [id: string]: string }>({});
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroLicencia>("Todas");
  const [mobileTab, setMobileTab] = useState<MobileTab>("licencias");
  const [configAbierta, setConfigAbierta] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchClubes = async () => {
      try {
        const response = await ClubesService.getAll();
        if (isMounted && response.data) {
          const map: { [id: string]: string } = {};
          response.data.forEach((c: { id: string; nombre: string }) => {
            map[c.id] = c.nombre;
          });
          setClubes(map);
        }
      } catch (err) {
        console.error("Error al cargar clubes para mapeo:", err);
      }
    };
    fetchClubes();
    return () => {
      isMounted = false;
    };
  }, []);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: "success" | "danger" | "warning" | "info" | "error";
  }>({ isOpen: false, title: "", description: "", type: "info" });

  const [licenciaAVerificar, setLicenciaAVerificar] = useState<Licencia | null>(
    null,
  );
  const [procesando, setProcesando] = useState(false);

  const [editingLicenciaId, setEditingLicenciaId] = useState<string | null>(null);
  const [editingFechaInput, setEditingFechaInput] = useState<string>("");
  const [savingFecha, setSavingFecha] = useState(false);

  const fetchLicencias = useCallback(
    async (
      isMounted: boolean,
      pageNumber: number,
      query?: string,
      filtro?: FiltroLicencia,
    ) => {
      setLoading(true);
      try {
        const estado = filtro ? FILTRO_A_ESTADO[filtro] : undefined;
        const response = await LicenciasService.getByPage(
          pageNumber,
          PAGE_SIZE,
          query,
          estado,
        );

        if (isMounted) {
          setLicencias(response.data || []);
          setTotal(response.total || 0);
        }
      } catch (error) {
        console.error("Error al cargar licencias:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    const defer = setTimeout(() => {
      void fetchLicencias(isMounted, page, search, filtroActivo);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(defer);
    };
  }, [fetchLicencias, page, search, filtroActivo]);

  const handleCambiarEstadoRapido = async (
    licenciaId: string,
    nuevoEstado: "Activa" | "Suspendida",
  ) => {
    setLoading(true);
    try {
      await LicenciasService.updateEstado(licenciaId, nuevoEstado);
      setFeedback({
        isOpen: true,
        title: nuevoEstado === "Activa" ? "Licencia aprobada" : "Licencia revocada",
        description:
          nuevoEstado === "Activa"
            ? "La licencia ha sido activada con éxito."
            : "La licencia ha sido suspendida correctamente.",
        type: nuevoEstado === "Activa" ? "success" : "info",
      });
      await fetchLicencias(true, page, search, filtroActivo);
    } catch (error) {
      console.error("Error al actualizar licencia rápido:", error);
      setFeedback({
        isOpen: true,
        title: "Error al actualizar",
        description: "No se pudo cambiar el estado de la licencia.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarFechaRapido = async (
    licenciaId: string,
    estadoActual: string,
  ) => {
    if (!editingFechaInput) return;
    setSavingFecha(true);
    try {
      await LicenciasService.updateEstado(
        licenciaId,
        estadoActual,
        editingFechaInput,
      );
      setFeedback({
        isOpen: true,
        title: "Vencimiento actualizado",
        description: "La fecha de vencimiento individual fue guardada.",
        type: "success",
      });
      setEditingLicenciaId(null);
      await fetchLicencias(true, page, search, filtroActivo);
    } catch (error) {
      console.error("Error al guardar fecha rápido:", error);
      setFeedback({
        isOpen: true,
        title: "Error",
        description: "No se pudo actualizar la fecha de vencimiento.",
        type: "error",
      });
    } finally {
      setSavingFecha(false);
    }
  };

  const confirmarEstadoLicencia = async (
    nuevoEstado: "Activa" | "Suspendida",
  ) => {
    if (!licenciaAVerificar) return;
    setProcesando(true);

    try {
      await LicenciasService.updateEstado(
        String(licenciaAVerificar.id),
        nuevoEstado,
      );

      setFeedback({
        isOpen: true,
        title:
          nuevoEstado === "Activa" ? "Licencia aprobada" : "Licencia rechazada",
        description:
          nuevoEstado === "Activa"
            ? "El alta del jugador se ha procesado con éxito."
            : "La solicitud ha sido rechazada correctamente.",
        type: nuevoEstado === "Activa" ? "success" : "info",
      });

      setLicenciaAVerificar(null);
      await fetchLicencias(true, page, search, filtroActivo);
    } catch (error) {
      console.error("Error al procesar licencia:", error);
      setFeedback({
        isOpen: true,
        title: "Error de servidor",
        description: "No se pudo actualizar el estado de la licencia.",
        type: "error",
      });
    } finally {
      setProcesando(false);
    }
  };

  const pendientes = contarPorEstado(licencias, "Pendiente");
  const vigentes = contarPorEstado(licencias, "Activa");
  const vencidas = contarPorEstado(licencias, "Vencida");

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-chartreuse mb-1">
              Gestión federativa
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Jugadores y licencias
            </h1>
            <p className="text-gray-400 mt-1 text-sm max-w-xl">
              Configurá el carnet del circuito y gestioná cada jugador. El
              vencimiento individual se edita haciendo clic en la fecha de cada
              tarjeta.
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
            <input
              type="text"
              placeholder="Buscar jugador, email o N° licencia..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-11 pr-4 py-3.5 bg-brand-input border border-white/5 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
            />
          </div>
        </div>

        {/* Stats rápidas — también actúan como atajo de filtro */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              { filtro: "Todas" as FiltroLicencia, label: "Total", value: total, icon: Users, color: "text-white" },
              {
                filtro: "Pendientes" as FiltroLicencia,
                label: "Pendientes",
                value: filtroActivo === "Pendientes" ? total : pendientes,
                icon: Clock,
                color: "text-yellow-400",
              },
              {
                filtro: "Vigentes" as FiltroLicencia,
                label: "Vigentes",
                value: filtroActivo === "Vigentes" ? total : vigentes,
                icon: ShieldCheck,
                color: "text-green-400",
              },
              {
                filtro: "Vencidas" as FiltroLicencia,
                label: "Vencidas",
                value: filtroActivo === "Vencidas" ? total : vencidas,
                icon: AlertTriangle,
                color: "text-red-400",
              },
            ] as const
          ).map((stat) => (
            <button
              key={stat.filtro}
              type="button"
              onClick={() => {
                setFiltroActivo(stat.filtro);
                setPage(1);
              }}
              className={`bg-[#111111] border rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-all ${
                filtroActivo === stat.filtro
                  ? "border-brand-chartreuse/50 ring-1 ring-brand-chartreuse/20"
                  : "border-white/5 hover:border-white/15"
              }`}
            >
              <stat.icon className={`size-5 ${stat.color} shrink-0`} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
                <p className={`text-xl font-black ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((filtro) => (
            <button
              key={filtro}
              type="button"
              onClick={() => {
                setFiltroActivo(filtro);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                filtroActivo === filtro
                  ? "bg-brand-chartreuse text-brand-black shadow-[0_0_10px_rgba(204,255,0,0.15)]"
                  : "bg-[#111111] text-gray-400 border border-white/5 hover:text-white hover:border-white/15"
              }`}
            >
              {filtro}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs mobile */}
      <div className="flex lg:hidden gap-2 p-1 bg-[#111111] border border-white/5 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab("licencias")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            mobileTab === "licencias"
              ? "bg-brand-chartreuse text-brand-black"
              : "text-gray-400"
          }`}
        >
          <Users className="size-4" />
          Jugadores
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("config")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            mobileTab === "config"
              ? "bg-brand-chartreuse text-brand-black"
              : "text-gray-400"
          }`}
        >
          <Settings2 className="size-4" />
          Config carnet
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-6 items-start">
        {/* Config colapsable en desktop */}
        <aside
          className={`lg:sticky lg:top-6 ${
            mobileTab === "config" ? "block" : "hidden lg:block"
          }`}
        >
          <button
            type="button"
            onClick={() => setConfigAbierta((v) => !v)}
            className="hidden lg:flex w-full items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            <span>Parámetros del carnet</span>
            {configAbierta ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
          {configAbierta && <ConfigLicenciasPanel scope="contexto" />}
        </aside>

        {/* Lista de jugadores */}
        <section
          className={`space-y-4 min-w-0 ${
            mobileTab === "licencias" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Altas y renovaciones
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {licencias.length} de {total}
                {filtroActivo !== "Todas" ? ` · filtro: ${filtroActivo}` : ""}
              </p>
            </div>
            
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-[#111111] border border-white/5 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : licencias.length === 0 ? (
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-16 text-center">
              <Users className="size-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                No se encontraron licencias
                {filtroActivo !== "Todas" ? ` con estado "${filtroActivo}"` : ""}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {licencias.map((jugador) => {
                const licencia = getDisplayLicencia(jugador.licencias);
                if (!licencia) return null;

                return (
                  <LicenciaJugadorCard
                    key={jugador.id}
                    jugador={jugador}
                    licencia={licencia}
                    editingLicenciaId={editingLicenciaId}
                    editingFechaInput={editingFechaInput}
                    onStartEditFecha={(id, fecha) => {
                      setEditingLicenciaId(id);
                      setEditingFechaInput(fecha);
                    }}
                    onChangeFecha={setEditingFechaInput}
                    onSaveFecha={handleGuardarFechaRapido}
                    onCancelEditFecha={() => setEditingLicenciaId(null)}
                    onValidar={() =>
                      setLicenciaAVerificar({ ...licencia, perfiles: jugador })
                    }
                    onCambiarEstado={handleCambiarEstadoRapido}
                    savingFecha={savingFecha}
                  />
                );
              })}
            </div>
          )}

          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            currentCount={licencias.length}
            onPageChange={setPage}
          />
        </section>
      </div>

      {licenciaAVerificar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-brand-card/95 border border-brand-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md relative shadow-2xl backdrop-blur-2xl">
            <div className="absolute -top-20 -right-20 size-45 rounded-full bg-brand-chartreuse/10 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 size-45 rounded-full bg-brand-chartreuse/5 blur-[60px] pointer-events-none" />

            <div className="flex flex-col items-center text-center mb-6 pt-2">
              <div className="size-14 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(203,254,1,0.1)]">
                <ShieldCheck className="size-7 text-brand-chartreuse" />
              </div>
              <h3 className="text-xl font-bold text-brand-white tracking-tight">
                Verificar Solicitud
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-normal max-w-[280px]">
                Revisá los datos federativos declarados por el jugador para su
                alta.
              </p>
            </div>

            <div className="space-y-4 mb-6 bg-brand-black/50 p-4 rounded-2xl border border-brand-white/5 relative z-10">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                  Jugador
                </p>
                <p className="text-sm font-semibold text-brand-white">
                  {licenciaAVerificar.perfiles?.nombre
                    ? `${licenciaAVerificar.perfiles.apellido?.toUpperCase()}, ${licenciaAVerificar.perfiles.nombre}`
                    : "No provisto"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {licenciaAVerificar.perfiles?.email}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                    DNI / Documento
                  </p>
                  <p className="text-sm font-mono text-brand-white font-semibold">
                    {licenciaAVerificar.datos_solicitud?.documento ||
                      "No provisto"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                    Provincia
                  </p>
                  <p className="text-sm font-semibold text-brand-white">
                    {licenciaAVerificar.datos_solicitud?.provincia ||
                      "No provista"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                  Club Representante Solicitado
                </p>
                <p className="text-sm font-bold text-brand-chartreuse">
                  {clubes[licenciaAVerificar.datos_solicitud?.club_id || ""] ||
                    "Cargando club..."}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">
                  Afiliaciones Cruzadas / Clubes Activos (
                  {licenciaAVerificar.perfiles?.afiliaciones?.length || 0})
                </p>
                {licenciaAVerificar.perfiles?.afiliaciones &&
                licenciaAVerificar.perfiles.afiliaciones.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {licenciaAVerificar.perfiles.afiliaciones.map((af) => (
                      <span
                        key={af.id}
                        className="px-2 py-0.5 bg-brand-chartreuse/10 border border-brand-chartreuse/20 rounded-md text-[10px] text-brand-chartreuse font-semibold uppercase"
                      >
                        {af.entidad}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Sin otras afiliaciones registradas.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 relative z-10">
              <button
                type="button"
                disabled={procesando}
                onClick={() => confirmarEstadoLicencia("Activa")}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-chartreuse text-brand-black font-extrabold rounded-xl hover:bg-[#b3e600] transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-brand-chartreuse/10"
              >
                {procesando ? (
                  "Procesando..."
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Aprobar y Afiliar
                    Jugador
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={() => confirmarEstadoLicencia("Suspendida")}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="size-4" /> Rechazar Solicitud
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={() => setLicenciaAVerificar(null)}
                className="w-full py-2.5 text-gray-500 font-medium hover:text-white transition-colors cursor-pointer text-sm mt-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={feedback.isOpen}
        onClose={() => setFeedback((prev) => ({ ...prev, isOpen: false }))}
        title={feedback.title}
        description={feedback.description}
        type={feedback.type}
      />
    </div>
  );
}
