"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Settings2,
  Users,
} from "lucide-react";
import {
  LicenciasService,
  type LicenciaConfigData,
  type ResumenLicencias,
} from "@/utils/services/licencias";
import { ClubesService } from "@/utils/services/clubes";
import { Licencia, Perfil } from "@/utils/types";
import FeedbackModal from "@/components/ui/FeedbackModal";
import Pagination from "@/components/ui/Pagination";
import { ConfigLicenciasPanel } from "@/components/licencias/ConfigLicenciasPanel";
import { LicenciaJugadorCard } from "@/components/licencias/LicenciaJugadorCard";
import { useProfileStore } from "@/store/useProfileStore";
import { PAGE_SIZE_JUGADORES } from "@/utils/jugadoresListado";

type VistaJugadores = "jugadores" | "configuracion";
type FiltroLicencia =
  | "Todas"
  | "Pendientes"
  | "Vigentes"
  | "Vencidas"
  | "Rechazadas";

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
  const { profile } = useProfileStore();
  const [licencias, setLicencias] = useState<Perfil[]>([]);
  const [clubes, setClubes] = useState<{ [id: string]: string }>({});
  const [total, setTotal] = useState<number>(0);
  const [resumen, setResumen] = useState<ResumenLicencias | null>(null);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroLicencia>("Todas");
  const [vista, setVista] = useState<VistaJugadores>("jugadores");
  const [contextoConfig, setContextoConfig] =
    useState<LicenciaConfigData | null>(null);

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
    const fetchContexto = async () => {
      try {
        const data = await LicenciasService.getConfigOrganizacion();
        if (isMounted) setContextoConfig(data);
      } catch {
        // Config opcional: la página sigue funcionando sin el banner.
      }
    };
    fetchClubes();
    fetchContexto();
    return () => {
      isMounted = false;
    };
  }, []);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: "success" | "danger" | "warning" | "info" | "error";
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
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
          PAGE_SIZE_JUGADORES,
          query,
          estado,
        );

        if (isMounted) {
          setLicencias(response.data || []);
          setTotal(response.total || 0);
          if (response.resumen) setResumen(response.resumen);
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

  const pedirCambioEstado = (
    licenciaId: string,
    nuevoEstado: "Activa" | "Suspendida",
    nombre: string,
  ) => {
    if (nuevoEstado !== "Suspendida") {
      void handleCambiarEstadoRapido(licenciaId, nuevoEstado);
      return;
    }
    setFeedback({
      isOpen: true,
      type: "danger",
      title: "¿Revocar licencia?",
      description: `¿Confirmás revocar la licencia de ${nombre}?`,
      confirmText: "Revocar",
      cancelText: "Cancelar",
      onConfirm: () => {
        setFeedback((prev) => ({ ...prev, isOpen: false, onConfirm: undefined }));
        void handleCambiarEstadoRapido(licenciaId, nuevoEstado);
      },
    });
  };

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

  const pendientes = resumen?.pendientes ?? contarPorEstado(licencias, "Pendiente");
  const vigentes = resumen?.vigentes ?? contarPorEstado(licencias, "Activa");
  const vencidas = resumen?.vencidas ?? contarPorEstado(licencias, "Vencida");
  const rechazadas = resumen?.rechazadas ?? contarPorEstado(licencias, "Suspendida");
  const totalJugadores = resumen?.total ?? total;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-3">
      <div className="flex h-10 items-center justify-between gap-3 max-xl:h-auto max-xl:flex-col max-xl:items-stretch">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="shrink-0 text-lg font-bold text-white">
            Jugadores
            {contextoConfig?.tipo === "asociacion"
              ? ` · ${
                  contextoConfig.subtitulo ||
                  contextoConfig.provincia ||
                  profile?.lugar_residencia ||
                  "tu provincia"
                }`
              : ""}
          </h1>
          <p className="truncate text-xs text-gray-400">
            El vencimiento individual se edita en la fecha de cada jugador.
          </p>
        </div>
        <div className="relative w-full shrink-0 xl:w-72">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar jugador, email o N° licencia..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-lg border border-white/5 bg-brand-input pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-brand-chartreuse/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex h-9 items-center gap-2 max-xl:h-auto max-xl:flex-wrap">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {(
            [
              { filtro: "Todas" as FiltroLicencia, label: "Total", value: totalJugadores, color: "text-white" },
              { filtro: "Pendientes" as FiltroLicencia, label: "Pendientes", value: pendientes, color: "text-yellow-400" },
              { filtro: "Vigentes" as FiltroLicencia, label: "Vigentes", value: vigentes, color: "text-green-400" },
              { filtro: "Vencidas" as FiltroLicencia, label: "Vencidas", value: vencidas, color: "text-red-400" },
              { filtro: "Rechazadas" as FiltroLicencia, label: "Rechazadas", value: rechazadas, color: "text-red-300" },
            ] as const
          ).map((stat) => (
            <button
              key={stat.filtro}
              type="button"
              onClick={() => {
                setFiltroActivo(stat.filtro);
                setPage(1);
                setVista("jugadores");
              }}
              className={`inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs ${
                filtroActivo === stat.filtro && vista === "jugadores"
                  ? "border-brand-chartreuse/50 bg-brand-chartreuse/10"
                  : "border-white/5 bg-[#111111] hover:border-white/15"
              }`}
            >
              <span className="truncate text-gray-400">{stat.label}</span>
              <span className={`font-black tabular-nums ${stat.color}`}>
                {stat.value}
              </span>
            </button>
          ))}
        </div>
        <div className="inline-flex h-8 shrink-0 items-center rounded-lg border border-white/5 bg-[#111111] p-0.5">
          <button
            type="button"
            onClick={() => setVista("jugadores")}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold ${
              vista === "jugadores"
                ? "bg-brand-chartreuse text-brand-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="size-3.5" />
            Jugadores
          </button>
          <button
            type="button"
            onClick={() => setVista("configuracion")}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold ${
              vista === "configuracion"
                ? "bg-brand-chartreuse text-brand-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Settings2 className="size-3.5" />
            Configuración
          </button>
        </div>
      </div>

      {vista === "configuracion" ? (
        <ConfigLicenciasPanel
          scope="contexto"
          variante="seccion"
          puedeEditar={contextoConfig?.puede_editar !== false}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 xl:hidden">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-white/10 bg-[#141414]"
                />
              ))
            ) : licencias.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-[#141414] px-4 py-6 text-sm text-gray-400">
                No se encontraron licencias
                {filtroActivo !== "Todas" ? ` con estado "${filtroActivo}"` : ""}.
              </p>
            ) : (
              licencias.map((jugador) => {
                const licencia = getDisplayLicencia(jugador.licencias);
                if (!licencia) return null;
                return (
                  <LicenciaJugadorCard
                    key={jugador.id}
                    presentacion="tarjeta"
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
                    onCambiarEstado={(licenciaId, estado) =>
                      pedirCambioEstado(
                        licenciaId,
                        estado,
                        jugador.nombre
                          ? `${jugador.apellido || ""}, ${jugador.nombre}`.replace(
                              /^, /,
                              "",
                            )
                          : "este jugador",
                      )
                    }
                    savingFecha={savingFecha}
                  />
                );
              })
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-brand-card xl:block">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-black/40">
                <tr className="h-8 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-0 font-bold">Jugador</th>
                  <th className="w-[12%] px-3 py-0 font-bold">DNI</th>
                  <th className="w-[10%] px-3 py-0 font-bold">Categoría</th>
                  <th className="w-[14%] px-3 py-0 font-bold">N° licencia</th>
                  <th className="w-[12%] px-3 py-0 font-bold">Estado</th>
                  <th className="w-[14%] px-3 py-0 font-bold">Vencimiento</th>
                  <th className="w-[16%] px-3 py-0 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="h-9 border-b border-white/5">
                      <td colSpan={7} className="px-3">
                        <div className="h-3 animate-pulse rounded bg-white/10" />
                      </td>
                    </tr>
                  ))
                ) : licencias.length === 0 ? (
                  <tr className="h-9">
                    <td colSpan={7} className="px-3 text-xs text-gray-500">
                      No se encontraron licencias
                      {filtroActivo !== "Todas"
                        ? ` con estado "${filtroActivo}"`
                        : ""}
                      .
                    </td>
                  </tr>
                ) : (
                  licencias.map((jugador) => {
                    const licencia = getDisplayLicencia(jugador.licencias);
                    if (!licencia) return null;
                    return (
                      <LicenciaJugadorCard
                        key={jugador.id}
                        presentacion="fila"
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
                          setLicenciaAVerificar({
                            ...licencia,
                            perfiles: jugador,
                          })
                        }
                        onCambiarEstado={(licenciaId, estado) =>
                          pedirCambioEstado(
                            licenciaId,
                            estado,
                            jugador.nombre
                              ? `${jugador.apellido || ""}, ${jugador.nombre}`.replace(
                                  /^, /,
                                  "",
                                )
                              : "este jugador",
                          )
                        }
                        savingFecha={savingFecha}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE_JUGADORES}
            currentCount={licencias.length}
            onPageChange={setPage}
          />
        </>
      )}

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
        confirmText={feedback.confirmText}
        cancelText={feedback.cancelText}
        onConfirm={feedback.onConfirm}
      />
    </div>
  );
}
