"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trophy,
  LayoutDashboard,
  Printer,
  Copy,
  Layers,
} from "lucide-react";
import { TorneosService } from "../../../utils/services/torneos";
import { ClubesService } from "../../../utils/services/clubes";
import { AsociacionesService } from "../../../utils/services/asociaciones";
import Pagination from "../../../components/ui/Pagination";
import { Torneo, Club, FormTorneoState, GrupoTorneoListado } from "../../../utils/types";

import TorneoModal from "../../../components/torneos/TorneoModal";
import ReplicarTorneoModal from "../../../components/torneos/ReplicarTorneoModal";
import AgruparTorneosModal from "../../../components/torneos/AgruparTorneosModal";
import TorneoFilasAgrupadas from "../../../components/torneos/TorneoFilasAgrupadas";
import FeedbackModal, {
  FeedbackModalProps,
} from "../../../components/ui/FeedbackModal";
import { useProfileStore } from "@/store/useProfileStore";
import { esRolFiscal } from "@/utils/auth/roles";
import { formatFechaCalendario } from "@/utils/formatFecha";
import TorneoVistaFiltros from "@/components/torneos/TorneoVistaFiltros";
import { MenuPuntos } from "@/components/ui/MenuPuntos";
import { hrefDetalleTorneo } from "@/components/torneos/wizard/stepLocks";
import { etiquetaNivelYCategoria } from "@/utils/etiquetaCategoria";
import {
  CONTADORES_VISTA_VACIOS,
  type VistaTorneoId,
} from "@/utils/constants/padelConfig";

const ESTADO_INICIAL: FormTorneoState = {
  nombre: "",
  club_id: "",
  fecha: "",
  nivel: "5ª",
  rama: "Masculina",
  categoria: "Libres",
  estado: "Borrador",
  cupos_maximos: 16,
  modalidad: "Parejas",
  formato: "Eliminatoria Directa",
  precio_inscripcion: 0,
  alcance: "Provincial",
  asociacion: "FAP",
  asociacion_id: null,
  premio_1: "",
  premio_2: "",
  premio_3: "",
  canchas_disponibles: 1,
  duracion_partido_minutos: 90,
  hora_inicio_jornada: "08:00",
};

const TAMANOS_PAGINA = [10, 25, 50] as const;
const PAGE_SIZE_INICIAL = 25;

const accionTorneo =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors";
const accionTorneoNeutra = `${accionTorneo} bg-white/5 text-gray-300 hover:bg-white/10 hover:text-brand-chartreuse`;
const accionTorneoAbrir = `${accionTorneo} bg-brand-chartreuse/10 text-brand-chartreuse hover:bg-brand-chartreuse/20`;

export default function TorneosPage() {
  // 2. Inicializamos el router
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);

  useEffect(() => {
    if (esRolFiscal(profile?.rol)) {
      router.replace("/dashboard/fiscal/torneos");
    }
  }, [profile?.rol, router]);

  const [vista, setVista] = useState<VistaTorneoId | "todos" | null>(null);
  const [vistaAutomatica, setVistaAutomatica] = useState(false);
  const [contadores, setContadores] = useState(CONTADORES_VISTA_VACIOS);
  const [requierenProgramacion, setRequierenProgramacion] = useState(0);
  const aplicarVistaServidor = useRef(false);
  const [search, setSearch] = useState<string>("");
  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [grupos, setGrupos] = useState<GrupoTorneoListado[]>([]);
  const [total, setTotal] = useState(0);
  const [totalTorneosVista, setTotalTorneosVista] = useState(0);
  const [clubs, setClubs] = useState<Club[]>([]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_INICIAL);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormTorneoState>(ESTADO_INICIAL);

  const [avisoAlcance, setAvisoAlcance] = useState<string | null>(null);
  const [replicarTorneo, setReplicarTorneo] = useState<Torneo | null>(null);
  const [agrupacion, setAgrupacion] = useState<{
    nombre: string;
    torneos: Torneo[];
  } | null>(null);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  useEffect(() => {
    if (aplicarVistaServidor.current) {
      aplicarVistaServidor.current = false;
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        const [torneosData, clubesResponse] = await Promise.all([
          TorneosService.getByPage(page, pageSize, search, undefined, {
            vista: vista ?? "auto",
            agrupar: true,
          }),
          ClubesService.getAll().catch(() => ({ data: [], total: 0 })),
        ]);

        if (isMounted) {
          setTournaments(torneosData.data || []);
          setGrupos(torneosData.grupos || []);
          setTotal(torneosData.total || 0);
          setTotalTorneosVista(
            torneosData.total_torneos ?? torneosData.total ?? 0,
          );
          setContadores(torneosData.contadores ?? CONTADORES_VISTA_VACIOS);
          setRequierenProgramacion(torneosData.requieren_programacion ?? 0);
          setAvisoAlcance(torneosData.aviso || null);
          setVistaAutomatica(Boolean(torneosData.vista_automatica));
          setClubs(clubesResponse?.data || []);
          if (
            vista === null &&
            torneosData.vista &&
            torneosData.vista !== "todos"
          ) {
            aplicarVistaServidor.current = true;
            setVista(torneosData.vista);
          }
        }
      } catch (error: unknown) {
        console.error("Error al conectar con la API:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, page, pageSize, search, vista]);

  // --- MANEJADORES DE ACCIONES ---
  const handleOpenCreate = () => {
    setFormData(ESTADO_INICIAL);
    setEditingId(null);
    setPage(1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (torneo: Torneo) => {
    router.push(`/dashboard/torneos/${torneo.id}?step=edit`);
  };

  const handleSaveTorneo = async () => {
    try {
      setSaving(true);

      const payloadToSave: FormTorneoState = {
        ...formData,
        club_id: formData.club_id === "" ? null : formData.club_id,
        // Set standard defaults for required fields when creating a new tournament
        nivel: formData.nivel || "5ª",
        rama: formData.rama || "Masculina",
        categoria: formData.categoria || "Libres",
        estado: formData.estado || "Borrador",
        cupos_maximos: formData.cupos_maximos || 16,
        modalidad: formData.modalidad || "Parejas",
        formato: formData.formato || "Eliminatoria Directa",
        precio_inscripcion: formData.precio_inscripcion || 0,
        alcance: formData.alcance ?? "Provincial",
        asociacion: formData.asociacion ?? "FAP",
        premios: {
          uno: "",
          dos: "",
          tres: "",
        },
      };

      if (!payloadToSave.asociacion_id) {
        try {
          const asocs = await AsociacionesService.getAll();
          const fap =
            asocs.find(
              (a) =>
                (a.sigla || "").toUpperCase() === "FAP" ||
                /federaci[oó]n argentina/i.test(a.nombre || ""),
            ) || null;
          if (fap?.id) {
            payloadToSave.asociacion_id = fap.id;
            payloadToSave.asociacion = "FAP";
          }
        } catch {
          /* backend también resuelve FAP */
        }
      }

      let createdTorneo;
      if (editingId) {
        createdTorneo = await TorneosService.update(editingId, payloadToSave);
      } else {
        createdTorneo = await TorneosService.create(payloadToSave);
      }

      setIsModalOpen(false);
      
      if (createdTorneo && createdTorneo.id) {
        router.push(`/dashboard/torneos/${createdTorneo.id}`);
      } else {
        router.refresh();
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar torneo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (id: string, nombre: string) => {
    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "Eliminar Torneo",
      description: `¿Eliminar el torneo «${nombre}»? Se borran también sus inscripciones. Esta acción no se puede deshacer.`,
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));

        TorneosService.delete(id)
          .then(() => {
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "¡Eliminado!",
              description: "El torneo fue borrado exitosamente.",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
            setLoading(true);
            setRefreshKey((prev) => prev + 1);
          })
          .catch((error: unknown) => {
            setFeedbackModal({
              isOpen: true,
              type: "warning",
              title: "Hubo un problema",
              description:
                "No pudimos eliminar el torneo. Detalle: " +
                (typeof error === "string" ? error : "Desconocido"),
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          });
      },
    });
  };

  const gruposVista: GrupoTorneoListado[] = grupos.length
    ? grupos
    : [
        {
          id: null,
          nombre: null,
          ramas: [{ rama: "", etiqueta: "", torneos: tournaments }],
        },
      ];

  const accionesDe = (t: Torneo) => (
    <>
      {t.estado === "Finalizado" && (
        <button
          type="button"
          onClick={async () => {
            try {
              const partidos = await TorneosService.getPartidos(t.id);
              const { generarPdfGrillaPartidos } = await import("@/utils/grillaPdf");
              generarPdfGrillaPartidos(t, partidos || []);
            } catch (err) {
              console.error("Error al imprimir PDF:", err);
            }
          }}
          className={accionTorneoNeutra}
          aria-label="Informe de resultados"
          title="Informe de resultados (PDF)"
        >
          <Printer className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => router.push(hrefDetalleTorneo("/dashboard", t))}
        className={accionTorneoAbrir}
        aria-label="Abrir el paso del estado"
        title="Abrir el paso del estado"
      >
        <LayoutDashboard className="size-4" />
      </button>
      {!t.solo_lectura && (
        <>
          <button
            type="button"
            onClick={() => handleOpenEdit(t)}
            className={accionTorneoNeutra}
            aria-label="Editar"
            title="Editar"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setReplicarTorneo(t)}
            className={accionTorneoNeutra}
            aria-label="Replicar"
            title="Replicar"
          >
            <Copy className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const grupo = grupos.find(
                (item) =>
                  item.nombre &&
                  item.ramas.some((rama) =>
                    rama.torneos.some((itemTorneo) => itemTorneo.id === t.id),
                  ),
              );
              if (grupo?.nombre) {
                setAgrupacion({
                  nombre: grupo.nombre,
                  torneos: grupo.ramas.flatMap((rama) => rama.torneos),
                });
                return;
              }
              const base = t.nombre.replace(/\s+[—–-]\s+.*$/, "").trim();
              setAgrupacion({
                nombre: base || t.nombre,
                torneos: [t],
              });
            }}
            className={accionTorneoNeutra}
            aria-label="Agrupar en una competencia"
            title="Agrupar en una competencia"
          >
            <Layers className="size-4" />
          </button>
          <MenuPuntos
            etiqueta={`Más acciones de ${t.nombre}`}
            items={[
              {
                label: "Eliminar",
                danger: true,
                onSelect: () => handleDeleteRequest(t.id, t.nombre),
              },
            ]}
          />
        </>
      )}
    </>
  );

  const tarjetaDe = (t: Torneo, enGrupo: boolean) => {
    const inscriptos = Array.isArray((t as Torneo & { inscripciones?: unknown[] }).inscripciones)
      ? (t as Torneo & { inscripciones: unknown[] }).inscripciones.length
      : t.cupos_actuales || 0;
    return (
      <article
        className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${
          enGrupo ? "border-l-[3px] border-l-brand-chartreuse" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(hrefDetalleTorneo("/dashboard", t))}
            className="cursor-pointer text-left text-[15px] font-bold text-white"
          >
            {t.nombre}
          </button>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-bold ${
              t.estado === "Inscripción"
                ? "text-[#00ff88]"
                : t.estado === "Programado"
                  ? "text-violet-400"
                  : t.estado === "En curso"
                    ? "text-[#ffb800]"
                    : t.estado === "Finalizado"
                      ? "text-blue-500"
                      : "text-gray-400"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                t.estado === "Inscripción"
                  ? "bg-[#00ff88]"
                  : t.estado === "Programado"
                    ? "bg-violet-500"
                    : t.estado === "En curso"
                      ? "bg-[#ffb800]"
                      : t.estado === "Finalizado"
                        ? "bg-blue-500"
                        : "bg-gray-500"
              }`}
            />
            {t.pendiente || t.estado || "Borrador"}
            {t.tiene_partidos_hoy ? " · Hoy" : ""}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {t.rama || ""}
          {t.rama ? " · " : ""}
          {etiquetaNivelYCategoria(t.nivel, t.categoria) || "Sin nivel"}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Sede</dt>
            <dd className="font-bold text-brand-white">{t.clubes?.nombre || "Sede a confirmar"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Fecha</dt>
            <dd className="font-medium text-brand-white">
              {t.fecha
                ? formatFechaCalendario(t.fecha, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "A confirmar"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Inscriptos</dt>
            <dd className="font-black text-white">
              {inscriptos}
              <span className="font-bold text-gray-500"> / {t.cupos_maximos || 32}</span>
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-white/10 pt-3">
          {accionesDe(t)}
        </div>
      </article>
    );
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gestión de torneos
          </h1>
          <p className="text-gray-400 mt-1">{totalTorneosVista} torneos en esta vista</p>
          {avisoAlcance && (
            <p className="mt-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              {avisoAlcance}
            </p>
          )}
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-card px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] text-sm"
        >
          <Plus className="size-5" /> Nuevo torneo
        </button>
      </div>

      <TorneoVistaFiltros
        vista={vista}
        contadores={contadores}
        vistaAutomatica={vistaAutomatica}
        requierenProgramacion={requierenProgramacion}
        busqueda={search}
        onBusqueda={(valor) => {
          setSearch(valor);
          setPage(1);
        }}
        onVista={(siguiente) => {
          setVistaAutomatica(false);
          setVista(siguiente);
          setPage(1);
        }}
      />

      {/* TABLA DE RESULTADOS */}
      <div className="bg-[#111111] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <>
          <div className="space-y-3 p-3 xl:hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="py-5 px-8">
                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-20 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-24 bg-white/10 rounded mx-auto"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-8">
                    <div className="h-3 w-20 bg-white/10 rounded ml-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-5 px-8">
                      <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-white/5 rounded"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-4 w-40 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <div className="h-8 w-20 bg-white/10 rounded-lg mx-auto"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-5 w-24 bg-white/10 rounded-full"></div>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                        <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <>
          <div className="p-3 xl:hidden">
            {tournaments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                <Trophy className="mb-4 size-10 opacity-50" />
                <span className="text-lg font-medium text-white">No se encontraron torneos</span>
                <span className="mt-1 text-sm">Ajustá los filtros o creá uno nuevo.</span>
              </div>
            ) : (
              <TorneoFilasAgrupadas
                grupos={gruposVista}
                colSpan={5}
                presentacion="tarjetas"
                onSumar={(grupo) =>
                  setAgrupacion({
                    nombre: grupo.nombre || "",
                    torneos: grupo.ramas.flatMap((rama) => rama.torneos),
                  })
                }
                renderFila={tarjetaDe}
              />
            )}
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider bg-black/20">
                  <th className="py-5 px-8">Torneo</th>
                  <th className="py-5 px-6">Sede / Fecha</th>
                  <th className="py-5 px-6 text-center">Inscriptos</th>
                  <th className="py-5 px-6">Estado</th>
                  <th className="py-5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tournaments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Trophy className="size-10 mb-4 opacity-50" />
                        <span className="font-medium text-lg text-white">
                          No se encontraron torneos
                        </span>
                        <span className="text-sm mt-1">
                          Ajustá los filtros o creá uno nuevo.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <TorneoFilasAgrupadas
                    grupos={gruposVista}
                    colSpan={5}
                    onSumar={(grupo) =>
                      setAgrupacion({
                        nombre: grupo.nombre || "",
                        torneos: grupo.ramas.flatMap((rama) => rama.torneos),
                      })
                    }
                    renderFila={(t, enGrupo) => (
                    <tr
                      key={t.id}
                      className={`transition-colors group ${
                        enGrupo
                          ? "bg-brand-chartreuse/[0.04] shadow-[inset_3px_0_0_0_var(--color-brand-chartreuse)]"
                          : "hover:bg-white/2"
                      }`}
                    >
                      <td className={enGrupo ? "py-2.5 pl-16 pr-8" : "py-4 px-8"}>
                        <button
                          type="button"
                          onClick={() => router.push(hrefDetalleTorneo("/dashboard", t))}
                          className="cursor-pointer text-left font-bold text-white group-hover:text-brand-chartreuse transition-colors text-[15px] wrap-break-word"
                        >
                          {t.nombre}
                        </button>
                        <div className="text-[13px] text-gray-500 mt-0.5 font-medium">
                          {[t.rama, etiquetaNivelYCategoria(t.nivel, t.categoria) || "Sin nivel"].filter(Boolean).join(" · ")}
                        </div>
                      </td>

                      <td className={enGrupo ? "py-2.5 px-6" : "py-4 px-6"}>
                        <div className="text-[14px] font-bold text-brand-white">
                          {t.clubes?.nombre || "Sede a confirmar"}
                        </div>
                        <div className="text-[13px] text-gray-500 mt-0.5">
                          {t.fecha
                            ? formatFechaCalendario(t.fecha, {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Fecha a confirmar"}
                        </div>
                      </td>

                      <td className={`text-center ${enGrupo ? "py-2.5 px-6" : "py-4 px-6"}`}>
                        <div className="inline-flex items-center justify-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[14px] font-black text-white">
                            {Array.isArray((t as any).inscripciones)
                              ? (t as any).inscripciones.length
                              : t.cupos_actuales || 0}
                          </span>
                          <span className="text-[13px] text-gray-500 font-bold ml-1">
                            / {t.cupos_maximos || 32}
                          </span>
                        </div>
                      </td>

                      <td className={enGrupo ? "py-2.5 px-6" : "py-4 px-6"}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              t.estado === "Inscripción"
                                ? "bg-[#00ff88]"
                                : t.estado === "Programado"
                                  ? "bg-violet-500"
                                  : t.estado === "En curso"
                                    ? "bg-[#ffb800]"
                                    : t.estado === "Cerrado"
                                      ? "bg-gray-400"
                                      : t.estado === "Finalizado"
                                        ? "bg-blue-500"
                                        : "bg-gray-500"
                            }`}
                          ></span>
                          <span
                            className={`text-[13px] font-bold ${
                              t.estado === "Inscripción"
                                ? "text-[#00ff88]"
                                : t.estado === "Programado"
                                  ? "text-violet-400"
                                  : t.estado === "En curso"
                                    ? "text-[#ffb800]"
                                    : t.estado === "Cerrado"
                                      ? "text-gray-400"
                                      : t.estado === "Finalizado"
                                        ? "text-blue-500"
                                        : "text-gray-400"
                            }`}
                          >
                            {t.pendiente || t.estado || "Borrador"}
                            {t.tiene_partidos_hoy ? " · Partidos hoy" : ""}
                          </span>
                        </div>
                      </td>

                      <td className={`whitespace-nowrap text-right ${enGrupo ? "py-2.5 px-4" : "py-3 px-4"}`}>
                        <div className="flex items-center justify-end gap-1">
                          {accionesDe(t)}
                        </div>
                      </td>
                    </tr>
                    )}
                  />
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        currentCount={grupos.length || tournaments.length}
        onPageChange={setPage}
        tamanos={TAMANOS_PAGINA}
        onPageSizeChange={(tamano) => {
          setPageSize(tamano);
          setPage(1);
        }}
      />

      <TorneoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTorneo}
        formData={formData}
        setFormData={setFormData}
        clubs={clubs}
        isSaving={saving}
        editingId={editingId}
      />

      <AgruparTorneosModal
        isOpen={Boolean(agrupacion)}
        nombreInicial={agrupacion?.nombre || ""}
        torneosFijos={agrupacion?.torneos || []}
        onClose={() => setAgrupacion(null)}
        onSuccess={(nombre) => {
          setRefreshKey((k) => k + 1);
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "Competencia agrupada",
            description: nombre
              ? `Los torneos quedaron en «${nombre}», separados por rama.`
              : "Los torneos seleccionados volvieron a mostrarse por separado.",
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }}
        onError={(message) => {
          setFeedbackModal({
            isOpen: true,
            type: "error",
            title: "No se pudo agrupar",
            description: message,
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }}
      />

      <ReplicarTorneoModal
        isOpen={Boolean(replicarTorneo)}
        torneo={replicarTorneo}
        onClose={() => setReplicarTorneo(null)}
        onSuccess={(n) => {
          setRefreshKey((k) => k + 1);
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "Torneos creados",
            description: `Se generaron ${n} torneo${n === 1 ? "" : "s"} en borrador.`,
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }}
        onError={(message) => {
          setFeedbackModal({
            isOpen: true,
            type: "error",
            title: "No se pudo replicar",
            description: message,
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }}
      />

      <FeedbackModal {...feedbackModal} />
    </div>
  );
}
