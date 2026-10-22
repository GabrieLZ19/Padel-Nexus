"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trophy,
  Building2,
  Calendar,
  Copy,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { sileo } from "sileo";
import { TorneosService } from "@/utils/services/torneos";
import { AsociacionesService } from "@/utils/services/asociaciones";
import { ClubPanelService } from "@/utils/services/club-panel";
import Pagination from "@/components/ui/Pagination";
import { Torneo, Club, FormTorneoState, GrupoTorneoListado } from "@/utils/types";
import TorneoModal from "@/components/torneos/TorneoModal";
import ReplicarTorneoModal from "@/components/torneos/ReplicarTorneoModal";
import AgruparTorneosModal from "@/components/torneos/AgruparTorneosModal";
import TorneoFilasAgrupadas from "@/components/torneos/TorneoFilasAgrupadas";
import FeedbackModal, { FeedbackModalProps } from "@/components/ui/FeedbackModal";
import { formatFechaCalendario } from "@/utils/formatFecha";
import TorneoVistaFiltros from "@/components/torneos/TorneoVistaFiltros";
import { MenuPuntos } from "@/components/ui/MenuPuntos";
import { hrefDetalleTorneo } from "@/components/torneos/wizard/stepLocks";
import { etiquetaNivelYCategoria } from "@/utils/etiquetaCategoria";
import {
  CONTADORES_VISTA_VACIOS,
  type VistaTorneoId,
} from "@/utils/constants/padelConfig";

const PAGE_SIZE = 6;

const accionTorneo =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors";
const accionTorneoNeutra = `${accionTorneo} bg-white/5 text-gray-300 hover:bg-white/10 hover:text-brand-chartreuse`;
const accionTorneoAbrir = `${accionTorneo} bg-brand-chartreuse/10 text-brand-chartreuse hover:bg-brand-chartreuse/20`;

function normalizarProvincia(valor?: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

async function idAsociacionDeProvincia(provincia: string) {
  const lista = await AsociacionesService.getAll(undefined, provincia);
  const clave = normalizarProvincia(provincia);
  const match =
    lista.find((item) => normalizarProvincia(item.provincia) === clave) ??
    lista[0];
  return match?.id ?? null;
}

export default function ClubTorneosPage() {
  const router = useRouter();

  const [club, setClub] = useState<Club | null>(null);
  const [vista, setVista] = useState<VistaTorneoId | "todos" | null>(null);
  const [vistaAutomatica, setVistaAutomatica] = useState(false);
  const [contadores, setContadores] = useState(CONTADORES_VISTA_VACIOS);
  const [requierenProgramacion, setRequierenProgramacion] = useState(0);
  const aplicarVistaServidor = useRef(false);
  const [search, setSearch] = useState<string>("");
  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replicarTorneo, setReplicarTorneo] = useState<Torneo | null>(null);
  const [agrupacion, setAgrupacion] = useState<{
    nombre: string;
    torneos: Torneo[];
  } | null>(null);
  const [grupos, setGrupos] = useState<GrupoTorneoListado[]>([]);

  const [formData, setFormData] = useState<FormTorneoState>({
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
    premio_1: "",
    premio_2: "",
    premio_3: "",
    canchas_disponibles: 1,
    duracion_partido_minutos: 90,
    hora_inicio_jornada: "08:00",
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
    title: "",
    description: "",
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const clubData = await ClubPanelService.getMiClub();
        setClub(clubData);
        if (clubData) {
          setFormData((prev) => ({ ...prev, club_id: String(clubData.id) }));
        }
      } catch (err) {
        console.error("Error al obtener club del usuario:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const loadData = async () => {
    if (!club?.id) {
      setTournaments([]);
      setTotal(0);
      return;
    }
    try {
      setLoading(true);
      const res = await TorneosService.getByPage(
        currentPage,
        PAGE_SIZE,
        search,
        undefined,
        {
          vista: vista ?? "auto",
          agrupar: true,
          clubId: String(club.id),
        },
      );

      // Defensa extra: nunca mostrar torneos de otro club
      const propios = (res.data || []).filter(
        (t) => String(t.club_id) === String(club.id),
      );
      setTournaments(propios);
      setGrupos(
        propios.length === (res.data || []).length ? res.grupos || [] : [],
      );
      setTotal(
        propios.length === (res.data || []).length
          ? res.total || propios.length
          : propios.length,
      );
      setContadores(res.contadores ?? CONTADORES_VISTA_VACIOS);
      setRequierenProgramacion(res.requieren_programacion ?? 0);
      setVistaAutomatica(Boolean(res.vista_automatica));
      if (vista === null && res.vista && res.vista !== "todos") {
        aplicarVistaServidor.current = true;
        setVista(res.vista);
      }
    } catch (err) {
      console.error("Error al cargar torneos del club:", err);
      setTournaments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aplicarVistaServidor.current) {
      aplicarVistaServidor.current = false;
      return;
    }
    if (club) {
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData usa club/vista/page/search
  }, [currentPage, search, club, vista]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      nombre: "",
      club_id: club ? String(club.id) : "",
      fecha: "",
      nivel: "",
      rama: "Masculina",
      categoria: "",
      estado: "Borrador",
      cupos_maximos: 16,
      modalidad: "Parejas",
      formato: "Americano",
      precio_inscripcion: 0,
      alcance: "Local",
      asociacion: "Amateur",
      premio_1: "",
      premio_2: "",
      premio_3: "",
      canchas_disponibles: 1,
      duracion_partido_minutos: 90,
      hora_inicio_jornada: "08:00",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Torneo) => {
    setEditingId(t.id);
    setFormData({
      nombre: t.nombre || "",
      club_id: String(t.club_id || (club ? club.id : "")),
      fecha: t.fecha || "",
      nivel: t.nivel || "Única",
      rama: (t as any).rama || "Masculina",
      categoria: t.categoria || "Americano",
      estado: t.estado || "Borrador",
      cupos_maximos: t.cupos_maximos || 16,
      modalidad: t.modalidad || "Parejas",
      formato: t.formato || "Americano",
      precio_inscripcion: t.precio_inscripcion || 0,
      alcance: t.alcance || "Local",
      asociacion: (t as any).asociacion || "Amateur",
      premio_1: t.premio_1 || "",
      premio_2: t.premio_2 || "",
      premio_3: t.premio_3 || "",
      canchas_disponibles: t.canchas_disponibles || 1,
      duracion_partido_minutos: t.duracion_partido_minutos || 90,
      hora_inicio_jornada: t.hora_inicio_jornada || "08:00",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (
      !formData.nombre ||
      !formData.fecha ||
      !formData.categoria ||
      !formData.nivel
    ) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Campos Incompletos",
        description:
          "Completá el nombre, la categoría, el nivel y la fecha de inicio del torneo.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        ...formData,
        club_id: club ? String(club.id) : formData.club_id,
      };

      if (
        (payload.alcance === "Provincial" || payload.alcance === "Regional") &&
        payload.asociacion !== "Amateur" &&
        club?.provincia
      ) {
        payload.asociacion_id = await idAsociacionDeProvincia(club.provincia);
      }

      if (editingId) {
        await TorneosService.update(editingId, payload);
        setIsModalOpen(false);
        void loadData();
        setFeedbackModal({
          isOpen: true,
          type: "success",
          title: "¡Torneo Actualizado!",
          description: "Los cambios en el torneo se guardaron con éxito.",
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } else {
        const creado = await TorneosService.create(payload);
        setIsModalOpen(false);
        sileo.success({
          title: "Torneo creado",
          description: "Seguí la configuración en el paso 1.",
        });
        router.push(`/club/torneos/${creado.id}?step=edit`);
      }
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: "danger",
        title: "Error al guardar",
        description: err?.response?.data?.message || err.message || "No se pudo guardar el torneo.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = (id: string, nombre: string) => {
    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "¿Eliminar Torneo?",
      description: `¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        try {
          setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
          await TorneosService.delete(id);
          setFeedbackModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          loadData();
        } catch (err: any) {
          setFeedbackModal({
            isOpen: true,
            type: "danger",
            title: "Error al eliminar",
            description:
              err?.response?.data?.message ||
              err.message ||
              "No se pudo eliminar el torneo.",
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const filteredTournaments = tournaments;
  const gruposVista: GrupoTorneoListado[] = grupos.length
    ? grupos
    : [
        {
          id: null,
          nombre: null,
          ramas: [{ rama: "", etiqueta: "", torneos: filteredTournaments }],
        },
      ];

  const accionesDe = (t: Torneo) => (
    <>
      <button
        type="button"
        onClick={() => router.push(hrefDetalleTorneo("/club", t))}
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
            onClick={() => handleOpenEditModal(t)}
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
                onSelect: () => handleConfirmDelete(t.id, t.nombre),
              },
            ]}
          />
        </>
      )}
    </>
  );

  const tarjetaDe = (t: Torneo, enGrupo: boolean) => (
    <article
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${
        enGrupo ? "border-l-[3px] border-l-brand-chartreuse" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(hrefDetalleTorneo("/club", t))}
          className="cursor-pointer text-left text-[15px] font-bold text-white"
        >
          {t.nombre}
        </button>
        <span className="shrink-0 text-xs font-bold text-gray-400">
          {t.pendiente || t.estado || "Borrador"}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {t.rama || ""}
        {t.rama ? " · " : ""}
        {[etiquetaNivelYCategoria(t.nivel, t.categoria) || "Sin nivel", t.alcance || "Local"].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-2 text-sm font-medium text-brand-white">
        {formatFechaCalendario(t.fecha, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) || "Fecha a confirmar"}
        <span className="ml-2 font-black">
          {t.cupos_actuales || 0}
          <span className="font-medium text-gray-500"> / {t.cupos_maximos || 16}</span>
        </span>
      </p>
      <div
        className="mt-3 flex items-center justify-end gap-1 border-t border-white/10 pt-3"
        onClick={(event) => event.stopPropagation()}
      >
        {accionesDe(t)}
      </div>
    </article>
  );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-brand-white">
              Torneos del Club
            </h1>
            {club && (
              <span className="bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20 px-3 py-1 rounded-full text-xs font-black uppercase">
                {club.nombre}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 font-medium">
            Gestión y creación de competencias locales y provinciales para tu sede.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] text-xs uppercase tracking-wider cursor-pointer shrink-0"
        >
          <Plus className="size-4" /> Crear Torneo
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
          setCurrentPage(1);
        }}
        onVista={(siguiente) => {
          setVistaAutomatica(false);
          setVista(siguiente);
          setCurrentPage(1);
        }}
      />

      {/* TABLA DE TORNEOS */}
      <div className="bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse">
            Cargando torneos de la sede...
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="p-16 text-center text-gray-500 space-y-3">
            <Trophy className="size-12 mx-auto opacity-30 text-brand-chartreuse" />
            <p className="text-sm font-bold text-white">No hay torneos registrados</p>
            <p className="text-xs text-gray-400">
              Creá un nuevo torneo local o provincial para comenzar a recibir inscripciones.
            </p>
          </div>
        ) : (
          <>
          <div className="p-3 xl:hidden">
            <TorneoFilasAgrupadas
              grupos={gruposVista}
              colSpan={6}
              presentacion="tarjetas"
              onSumar={(grupo) =>
                setAgrupacion({
                  nombre: grupo.nombre || "",
                  torneos: grupo.ramas.flatMap((rama) => rama.torneos),
                })
              }
              renderFila={tarjetaDe}
            />
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="py-4 px-6">Torneo</th>
                  <th className="py-4 px-6">Fecha Inicio</th>
                  <th className="py-4 px-6">Alcance</th>
                  <th className="py-4 px-6 text-center">Inscritos</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5 text-sm">
                <TorneoFilasAgrupadas
                  grupos={gruposVista}
                  colSpan={6}
                  onSumar={(grupo) =>
                    setAgrupacion({
                      nombre: grupo.nombre || "",
                      torneos: grupo.ramas.flatMap((rama) => rama.torneos),
                    })
                  }
                  renderFila={(t, enGrupo) => (
                  <tr
                    key={t.id}
                    className={`transition-colors cursor-pointer ${
                      enGrupo
                        ? "bg-brand-chartreuse/[0.04] shadow-[inset_3px_0_0_0_var(--color-brand-chartreuse)]"
                        : "hover:bg-brand-white/2"
                    }`}
                    onClick={() => router.push(hrefDetalleTorneo("/club", t))}
                  >
                    <td className={enGrupo ? "py-2.5 pl-16 pr-6" : "py-4 px-6"}>
                      <p className="font-bold text-white">{t.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        {[(t as { rama?: string }).rama, etiquetaNivelYCategoria(t.nivel, t.categoria) || "Sin nivel"].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className={`text-gray-300 font-medium ${enGrupo ? "py-2.5 px-6" : "py-4 px-6"}`}>
                      {formatFechaCalendario(t.fecha, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className={enGrupo ? "py-2.5 px-6" : "py-4 px-6"}>
                      <span className="bg-brand-white/5 text-gray-300 border border-brand-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase">
                        {t.alcance || "Local"}
                      </span>
                    </td>
                    <td className={`text-center ${enGrupo ? "py-2.5 px-6" : "py-4 px-6"}`}>
                      <span className="text-white font-black">{t.cupos_actuales || 0}</span>
                      <span className="text-gray-500 font-medium"> / {t.cupos_maximos || 16}</span>
                    </td>
                    <td className={enGrupo ? "py-2.5 px-6" : "py-4 px-6"}>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                          t.estado === "Inscripción"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : t.estado === "Programado"
                              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                              : t.estado === "En curso"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : t.estado === "Finalizado"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-white/5 text-gray-400 border border-white/10"
                        }`}
                      >
                        {t.pendiente || t.estado || "Borrador"}
                        {t.tiene_partidos_hoy ? " · Partidos hoy" : ""}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap text-right ${enGrupo ? "py-2.5 px-4" : "py-3 px-4"}`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {accionesDe(t)}
                      </div>
                    </td>
                  </tr>
                  )}
                />
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* PAGINACIÓN */}
      {total > PAGE_SIZE && (
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={total}
          currentCount={grupos.length || filteredTournaments.length}
          onPageChange={setCurrentPage}
        />
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isModalOpen && (
        <TorneoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          formData={formData}
          setFormData={setFormData}
          clubs={club ? [club] : []}
          isSaving={saving}
          editingId={editingId}
          sedeFija
        />
      )}

      <AgruparTorneosModal
        isOpen={Boolean(agrupacion)}
        nombreInicial={agrupacion?.nombre || ""}
        torneosFijos={agrupacion?.torneos || []}
        clubId={club?.id ? String(club.id) : undefined}
        onClose={() => setAgrupacion(null)}
        onSuccess={(nombre) => {
          void loadData();
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "Competencia agrupada",
            description: nombre
              ? `Los torneos quedaron en «${nombre}», separados por rama.`
              : "Los torneos seleccionados volvieron a mostrarse por separado.",
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }}
        onError={(message) => {
          setFeedbackModal({
            isOpen: true,
            type: "error",
            title: "No se pudo agrupar",
            description: message,
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }}
      />

      <ReplicarTorneoModal
        isOpen={Boolean(replicarTorneo)}
        torneo={replicarTorneo}
        modoClub
        onClose={() => setReplicarTorneo(null)}
        onSuccess={(n) => {
          loadData();
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

      {/* MODAL DE FEEDBACK DE CONFIRMACIÓN */}
      <FeedbackModal {...feedbackModal} />
    </div>
  );
}
