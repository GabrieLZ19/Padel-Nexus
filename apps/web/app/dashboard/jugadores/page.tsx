"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Settings2,
  Users,
  Info,
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
import JugadoresContactosPanel from "@/components/crm/JugadoresContactosPanel";
import {
  licenciaPreferidaListado,
  licenciasComoArray,
} from "@/utils/licenciasArray";
import {
  etiquetaEstadoPagoLicencia,
  formatMontoLicenciaArs,
  licenciaMontoPendiente,
  licenciaTienePagoPendiente,
} from "@/utils/licenciaPago";

type VistaJugadores = "jugadores" | "contactos" | "configuracion";
type FiltroLicencia =
  | "Todas"
  | "Pendientes"
  | "Vigentes"
  | "Vencidas"
  | "Suspendidas";

const FILTRO_A_ESTADO: Record<
  FiltroLicencia,
  Licencia["estado"] | undefined
> = {
  Todas: undefined,
  Pendientes: "Pendiente",
  Vigentes: "Activa",
  Vencidas: "Vencida",
  Suspendidas: "Suspendida",
};

function contarPorEstado(items: Perfil[], estado: Licencia["estado"]) {
  return items.filter((j) =>
    licenciasComoArray(j.licencias).some((l) => l.estado === estado),
  ).length;
}

function nombreJugadorListado(jugador: Perfil): string {
  return jugador.nombre
    ? `${jugador.apellido || ""}, ${jugador.nombre}`.replace(/^, /, "")
    : "este jugador";
}

function etiquetaClubRepresentante(
  licencia: Licencia,
  clubes: Record<string, string>,
): string {
  const clubId =
    licencia.club_id ||
    (licencia.datos_solicitud as { club_id?: string } | undefined)?.club_id;
  if (!clubId) return "Sin club de referencia";
  return clubes[clubId] || "Club no encontrado";
}

export default function JugadoresLicenciasPage() {
  const searchParams = useSearchParams();
  const { profile } = useProfileStore();
  const esSuperadmin = profile?.rol === "superadmin";
  const [licencias, setLicencias] = useState<Perfil[]>([]);
  const [clubes, setClubes] = useState<{ [id: string]: string }>({});
  const [total, setTotal] = useState<number>(0);
  const [resumen, setResumen] = useState<ResumenLicencias | null>(null);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroLicencia>("Todas");
  const [vista, setVista] = useState<VistaJugadores>("jugadores");

  useEffect(() => {
    if (searchParams.get("vista") === "contactos" && esSuperadmin) {
      setVista("contactos");
    }
  }, [searchParams, esSuperadmin]);
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

  const [suspenderLicencia, setSuspenderLicencia] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  const pedirCambioEstado = (
    licenciaId: string,
    nuevoEstado: "Activa" | "Suspendida",
    nombre: string,
  ) => {
    if (nuevoEstado !== "Suspendida") {
      void handleCambiarEstadoRapido(licenciaId, nuevoEstado);
      return;
    }
    setSuspenderLicencia({ id: licenciaId, nombre });
  };

  const handleCambiarEstadoRapido = async (
    licenciaId: string,
    nuevoEstado: "Activa" | "Suspendida",
    motivo?: string,
  ) => {
    setLoading(true);
    try {
      await LicenciasService.updateEstado(licenciaId, nuevoEstado, undefined, motivo);
      setFeedback({
        isOpen: true,
        title:
          nuevoEstado === "Activa" ? "Licencia aprobada" : "Licencia suspendida",
        description:
          nuevoEstado === "Activa"
            ? "La licencia ha sido activada con éxito."
            : "La licencia quedó suspendida. El jugador puede reactivarse cuando corresponda.",
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
      const actualizada = await LicenciasService.updateEstado(
        licenciaId,
        estadoActual,
        editingFechaInput,
      );
      let description = "La fecha de vencimiento individual fue guardada.";
      if (estadoActual === "Vencida" && actualizada.estado === "Activa") {
        description =
          "La licencia quedó vigente con la nueva fecha de vencimiento.";
      } else if (estadoActual === "Activa" && actualizada.estado === "Vencida") {
        description =
          "Con esa fecha la licencia figura vencida. Podés ampliar el vencimiento o reactivarla si corresponde.";
      }
      setFeedback({
        isOpen: true,
        title: "Vencimiento actualizado",
        description,
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
  const suspendidas =
    resumen?.suspendidas ?? contarPorEstado(licencias, "Suspendida");

  const pedirDarDeBaja = (licenciaId: string, nombre: string) => {
    setFeedback({
      isOpen: true,
      type: "danger",
      title: "¿Dar de baja la licencia?",
      description: `Se eliminará el carnet de ${nombre} de forma definitiva. El jugador deberá iniciar un nuevo trámite.`,
      confirmText: "Dar de baja",
      cancelText: "Cancelar",
      onConfirm: () => {
        setFeedback((prev) => ({ ...prev, isOpen: false, onConfirm: undefined }));
        void (async () => {
          setLoading(true);
          try {
            await LicenciasService.darDeBaja(licenciaId);
            setFeedback({
              isOpen: true,
              title: "Licencia dada de baja",
              description: "El carnet fue eliminado del sistema.",
              type: "info",
            });
            await fetchLicencias(true, page, search, filtroActivo);
          } catch (error) {
            console.error("Error al dar de baja licencia:", error);
            setFeedback({
              isOpen: true,
              title: "Error",
              description: "No se pudo dar de baja la licencia.",
              type: "error",
            });
          } finally {
            setLoading(false);
          }
        })();
      },
    });
  };
  const totalJugadores = resumen?.total ?? total;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-3">
      <div className="flex h-10 items-center justify-between gap-3 max-xl:h-auto max-xl:flex-col max-xl:items-stretch">
        <div className="flex min-w-0 items-center gap-2">
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
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-brand-chartreuse transition-colors cursor-pointer"
              aria-label="Información de vencimiento"
            >
              <Info className="size-4" />
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-64 rounded-xl border border-white/10 bg-[#161616] p-2.5 text-xs text-gray-300 shadow-2xl group-hover:block group-focus-within:block">
              El vencimiento individual se edita en la fecha de cada jugador.
            </div>
          </div>
        </div>
        {vista !== "contactos" ? (
          <div className="relative w-full shrink-0 xl:w-72">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, DNI, email o N° licencia..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-white/5 bg-brand-input pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-brand-chartreuse/50 focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 xl:h-9 xl:flex-row xl:items-center xl:justify-between">
        {vista === "jugadores" ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none w-full xl:w-auto xl:flex-1">
            {(
              [
                { filtro: "Todas" as FiltroLicencia, label: "Total", value: totalJugadores, color: "text-white" },
                { filtro: "Pendientes" as FiltroLicencia, label: "Pendientes", value: pendientes, color: "text-yellow-400" },
                { filtro: "Vigentes" as FiltroLicencia, label: "Vigentes", value: vigentes, color: "text-green-400" },
                { filtro: "Vencidas" as FiltroLicencia, label: "Vencidas", value: vencidas, color: "text-red-400" },
                { filtro: "Suspendidas" as FiltroLicencia, label: "Suspendidas", value: suspendidas, color: "text-orange-300" },
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
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  filtroActivo === stat.filtro && vista === "jugadores"
                    ? "border-brand-chartreuse/50 bg-brand-chartreuse/10 text-white"
                    : "border-white/5 bg-[#111111] hover:border-white/15 text-gray-400"
                }`}
              >
                <span>{stat.label}</span>
                <span className={`font-black tabular-nums ${stat.color}`}>
                  {stat.value}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="inline-flex h-8 shrink-0 items-center rounded-lg border border-white/5 bg-[#111111] p-0.5 self-start xl:self-auto">
          {esSuperadmin ? (
            <button
              type="button"
              onClick={() => setVista("contactos")}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors cursor-pointer ${
                vista === "contactos"
                  ? "bg-brand-chartreuse text-brand-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="size-3.5" />
              Base de contactos
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setVista("jugadores")}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors cursor-pointer ${
              vista === "jugadores"
                ? "bg-brand-chartreuse text-brand-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="size-3.5" />
            {esSuperadmin ? "Licencias" : "Jugadores"}
          </button>
          <button
            type="button"
            onClick={() => setVista("configuracion")}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors cursor-pointer ${
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

      {vista === "contactos" && esSuperadmin ? (
        <JugadoresContactosPanel />
      ) : vista === "configuracion" ? (
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
                const licencia = licenciaPreferidaListado(jugador.licencias);
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
                        nombreJugadorListado(jugador),
                      )
                    }
                    onDarDeBaja={(licenciaId) =>
                      pedirDarDeBaja(licenciaId, nombreJugadorListado(jugador))
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
                    const licencia = licenciaPreferidaListado(jugador.licencias);
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
                            nombreJugadorListado(jugador),
                          )
                        }
                        onDarDeBaja={(licenciaId) =>
                          pedirDarDeBaja(
                            licenciaId,
                            nombreJugadorListado(jugador),
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
                  Club de referencia (opcional)
                </p>
                <p className="text-sm font-bold text-brand-chartreuse">
                  {etiquetaClubRepresentante(licenciaAVerificar, clubes)}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                    Estado del pago
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      licenciaTienePagoPendiente(licenciaAVerificar)
                        ? "text-amber-400"
                        : "text-brand-white"
                    }`}
                  >
                    {etiquetaEstadoPagoLicencia(licenciaAVerificar)}
                  </p>
                </div>
                {licenciaMontoPendiente(licenciaAVerificar) > 0 ? (
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                      Monto
                    </p>
                    <p className="text-sm font-bold text-brand-white tabular-nums">
                      {formatMontoLicenciaArs(
                        licenciaMontoPendiente(licenciaAVerificar),
                      )}
                    </p>
                  </div>
                ) : null}
              </div>

              {licenciaTienePagoPendiente(licenciaAVerificar) ? (
                <p className="text-[11px] text-amber-300/90 leading-snug bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  El jugador aún no completó el pago. Podés aprobar la ficha; deberá
                  abonar desde Mi panel.
                </p>
              ) : null}

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
      <FeedbackModal
        isOpen={!!suspenderLicencia}
        type="warning"
        title="¿Suspender licencia?"
        description={
          suspenderLicencia
            ? `La licencia de ${suspenderLicencia.nombre} quedará suspendida. El jugador recibirá una notificación con el motivo.`
            : ""
        }
        confirmText="Suspender"
        cancelText="Cancelar"
        isLoading={loading}
        showInput
        inputType="textarea"
        inputLabel="Motivo (obligatorio)"
        inputPlaceholder="Ej. falta de pago, documentación incompleta..."
        onClose={() => setSuspenderLicencia(null)}
        onConfirm={(motivo) => {
          if (!suspenderLicencia || !motivo?.trim()) return;
          void handleCambiarEstadoRapido(
            suspenderLicencia.id,
            "Suspendida",
            motivo.trim(),
          ).finally(() => setSuspenderLicencia(null));
        }}
      />
    </div>
  );
}
