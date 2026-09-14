"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Megaphone,
  Send,
  Users,
  History,
  Plus,
  Trash2,
  Eye,
  ListPlus,
  Building2,
  MapPin,
  Trophy,
  Globe,
  Landmark,
  User,
  Pencil,
} from "lucide-react";
import { isAxiosError } from "axios";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal, {
  type FeedbackModalProps,
} from "@/components/ui/FeedbackModal";
import { ComunicacionesService } from "@/utils/services/comunicaciones";
import { AsociacionesService } from "@/utils/services/asociaciones";
import { ClubesService } from "@/utils/services/clubes";
import { TorneosService } from "@/utils/services/torneos";
import { PROVINCIAS_ARG, NIVELES_PADEL } from "@/utils/constants/padelConfig";
import { useProfileStore } from "@/store/useProfileStore";
import type {
  AudienciaPreview,
  ComunicacionesAudienciaTipo,
  ComunicacionesCampana,
  ComunicacionesContactoBusqueda,
  ComunicacionesEtiqueta,
  ComunicacionesFiltros,
  ComunicacionesLicenciaEstado,
  ComunicacionesLista,
  ComunicacionesListaTipo,
} from "@/utils/types/comunicaciones.types";

const ETIQUETAS_OPTS: ComunicacionesEtiqueta[] = ["marketing", "institucional"];

type TabId = "enviar" | "listas" | "historial";

/**
 * Categoria de destinatario (paso 1 del wizard). Segun el PDF de observaciones
 * de septiembre 2026, el envio debe hacerse eligiendo primero el tipo de
 * destinatario y luego mostrando solo los filtros aplicables a esa audiencia.
 */
type CategoriaDestinatario = "asociaciones" | "jugadores" | "clubes";

const AUDIENCIA_LABELS: Record<ComunicacionesAudienciaTipo, string> = {
  admins_asociaciones: "Admins de asociaciones",
  admins_clubes: "Admins de clubes",
  jugadores_provincia: "Jugadores por provincia",
  jugadores_asociacion: "Jugadores por asociación",
  jugadores_club: "Jugadores por club",
  inscritos_torneo: "Inscritos de un torneo",
  lista: "Lista guardada",
  manual_ids: "Selección manual",
  plataforma: "Toda la plataforma (jugadores)",
};

/**
 * Mapa de tipos de audiencia por categoria de destinatario.
 * Se combina con los permisos por rol para decidir que mostrar en el wizard.
 */
const TIPOS_POR_CATEGORIA: Record<
  CategoriaDestinatario,
  ComunicacionesAudienciaTipo[]
> = {
  asociaciones: ["admins_asociaciones"],
  jugadores: [
    "jugadores_provincia",
    "jugadores_asociacion",
    "jugadores_club",
    "inscritos_torneo",
    "plataforma",
  ],
  clubes: ["admins_clubes"],
};

/**
 * Umbral (en cantidad de destinatarios) a partir del cual el envio se considera
 * "masivo" y requiere confirmacion reforzada aunque no sea la audiencia `plataforma`.
 */
const CONFIRMACION_REFORZADA_UMBRAL = 500;

function errorMessage(err: unknown, fallback: string) {
  if (isAxiosError(err)) {
    return (
      (err.response?.data as { error?: string })?.error ||
      err.message ||
      fallback
    );
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function ContactoAvatar({
  avatarUrl,
  size = 32,
}: {
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <div
        className="relative shrink-0 rounded-full overflow-hidden border border-brand-white/10 bg-brand-black"
        style={{ width: size, height: size }}
      >
        <Image
          src={avatarUrl}
          alt=""
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 rounded-full border border-brand-white/10 bg-brand-black/60 flex items-center justify-center text-gray-500"
      style={{ width: size, height: size }}
    >
      <User style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}

function nombrePersona(u: {
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  dni?: string | null;
}) {
  const full = `${u.apellido || ""} ${u.nombre || ""}`.trim();
  return full || u.email || u.dni || "Sin nombre";
}

export default function ComunicacionesPanel() {
  const { profile } = useProfileStore();
  const rol = profile?.rol || "";

  const [tab, setTab] = useState<TabId>("enviar");
  const [listas, setListas] = useState<ComunicacionesLista[]>([]);
  const [campanas, setCampanas] = useState<ComunicacionesCampana[]>([]);
  const [loadingListas, setLoadingListas] = useState(true);
  const [loadingCampanas, setLoadingCampanas] = useState(false);

  // Catalogos: guardamos `provincia` como metadato para filtrar por rol.
  const [asociaciones, setAsociaciones] = useState<
    { value: string; label: string; provincia?: string | null }[]
  >([]);
  const [clubes, setClubes] = useState<
    { value: string; label: string; provincia?: string | null }[]
  >([]);
  const [torneos, setTorneos] = useState<{ value: string; label: string }[]>([]);

  // Composer
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [categoriaDest, setCategoriaDest] =
    useState<CategoriaDestinatario>("jugadores");
  const [audienciaTipo, setAudienciaTipo] =
    useState<ComunicacionesAudienciaTipo>("jugadores_provincia");
  const [provincia, setProvincia] = useState("");
  const [asociacionId, setAsociacionId] = useState("");
  const [clubId, setClubId] = useState("");
  const [torneoId, setTorneoId] = useState("");
  const [listaId, setListaId] = useState("");
  const [categoriaPadel, setCategoriaPadel] = useState("");
  const [licenciaEstado, setLicenciaEstado] =
    useState<"" | ComunicacionesLicenciaEstado>("");
  const [actionUrl, setActionUrl] = useState("");
  const [preview, setPreview] = useState<AudienciaPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Listas form
  const [listaEditandoId, setListaEditandoId] = useState<string | null>(null);
  const [listaNombre, setListaNombre] = useState("");
  const [listaTipo, setListaTipo] = useState<ComunicacionesListaTipo>("manual");
  const [listaDesc, setListaDesc] = useState("");
  const [listaEtiquetas, setListaEtiquetas] = useState<ComunicacionesEtiqueta[]>(
    [],
  );
  const [listaProvincia, setListaProvincia] = useState("");
  const [listaAsociacionId, setListaAsociacionId] = useState("");
  const [listaClubId, setListaClubId] = useState("");
  const [miembroIds, setMiembroIds] = useState<string[]>([]);
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState<
    ComunicacionesContactoBusqueda[]
  >([]);
  const [busquedaMiembro, setBusquedaMiembro] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<
    ComunicacionesContactoBusqueda[]
  >([]);
  const [buscandoContactos, setBuscandoContactos] = useState(false);
  const [guardandoLista, setGuardandoLista] = useState(false);
  const [cargandoListaDetalle, setCargandoListaDetalle] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackModalProps>({
    isOpen: false,
    onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
    title: "",
    description: "",
    type: "warning",
  });

  const puedePlataforma =
    rol === "superadmin" || rol === "admin_federacion";

  /**
   * Categorias de destinatario habilitadas para el rol actual.
   * Provincial ve solo Clubes y Jugadores (segun observaciones 13-9-2026).
   * Club solo ve Jugadores (de su propio club).
   */
  const categoriasDisponibles = useMemo<CategoriaDestinatario[]>(() => {
    if (rol === "admin_club") return ["jugadores"];
    if (rol === "admin_provincial") return ["clubes", "jugadores"];
    // Fed, superadmin, admin generico
    return ["asociaciones", "jugadores", "clubes"];
  }, [rol]);

  /**
   * Tipos de audiencia disponibles dentro de la categoria elegida, filtrados
   * por permisos del rol (ej. `plataforma` solo para fed/superadmin).
   */
  const audienciasDisponibles = useMemo<ComunicacionesAudienciaTipo[]>(() => {
    const base = TIPOS_POR_CATEGORIA[categoriaDest] || [];
    let tipos = base.filter((t) => {
      if (t === "plataforma") return puedePlataforma;
      return true;
    });
    if (rol === "admin_club") {
      // Solo comunica a jugadores de su club.
      tipos = tipos.filter((t) => t === "jugadores_club");
    }
    return tipos;
  }, [categoriaDest, puedePlataforma, rol]);

  const esAudienciaJugadores =
    audienciaTipo === "jugadores_provincia" ||
    audienciaTipo === "jugadores_asociacion" ||
    audienciaTipo === "jugadores_club" ||
    audienciaTipo === "inscritos_torneo" ||
    audienciaTipo === "plataforma";

  const buildFiltros = useCallback((): ComunicacionesFiltros => {
    const filtros: ComunicacionesFiltros = {};
    if (provincia) filtros.provincias = [provincia];
    if (asociacionId) filtros.asociacion_ids = [asociacionId];
    if (clubId) filtros.club_ids = [clubId];
    if (torneoId) filtros.torneo_id = torneoId;
    if (
      categoriaPadel &&
      (audienciaTipo === "jugadores_provincia" ||
        audienciaTipo === "jugadores_asociacion" ||
        audienciaTipo === "jugadores_club")
    ) {
      filtros.categorias = [categoriaPadel];
    }
    if (audienciaTipo === "jugadores_provincia" || audienciaTipo === "plataforma") {
      filtros.solo_rol_usuario = true;
    }
    // Filtro por estado de licencia: aplica a audiencias de jugadores.
    if (
      licenciaEstado &&
      (audienciaTipo === "jugadores_provincia" ||
        audienciaTipo === "jugadores_asociacion" ||
        audienciaTipo === "jugadores_club" ||
        audienciaTipo === "inscritos_torneo" ||
        audienciaTipo === "plataforma")
    ) {
      filtros.licencia_estado = licenciaEstado;
    }
    return filtros;
  }, [
    provincia,
    asociacionId,
    clubId,
    torneoId,
    categoriaPadel,
    audienciaTipo,
    licenciaEstado,
  ]);

  const cargarListas = useCallback(async () => {
    setLoadingListas(true);
    try {
      const data = await ComunicacionesService.listarListas();
      setListas(data);
    } catch (err) {
      sileo.error({
        title: "Error",
        description: errorMessage(err, "No se pudieron cargar las listas."),
      });
    } finally {
      setLoadingListas(false);
    }
  }, []);

  const cargarCampanas = useCallback(async () => {
    setLoadingCampanas(true);
    try {
      const res = await ComunicacionesService.listarCampanas({ limit: 50 });
      setCampanas(res.data);
    } catch (err) {
      sileo.error({
        title: "Error",
        description: errorMessage(err, "No se pudo cargar el historial."),
      });
    } finally {
      setLoadingCampanas(false);
    }
  }, []);

  useEffect(() => {
    void cargarListas();
  }, [cargarListas]);

  useEffect(() => {
    if (tab === "historial") void cargarCampanas();
  }, [tab, cargarCampanas]);

  useEffect(() => {
    void (async () => {
      const [asocs, clubsRes, tors] = await Promise.all([
        AsociacionesService.getAll(),
        ClubesService.getAll({ limit: 500 }),
        TorneosService.getAll({ limit: 100 }),
      ]);

      setAsociaciones(
        asocs.map((a) => ({
          value: a.id,
          label: `${a.sigla ? `${a.sigla} · ` : ""}${a.nombre}${a.provincia ? ` (${a.provincia})` : ""}`,
          provincia: a.provincia ?? null,
        })),
      );

      const clubsData = Array.isArray(clubsRes?.data) ? clubsRes.data : [];
      setClubes(
        clubsData.map((c: { id: string; nombre: string; provincia?: string }) => ({
          value: c.id,
          label: `${c.nombre}${c.provincia ? ` · ${c.provincia}` : ""}`,
          provincia: c.provincia ?? null,
        })),
      );

      setTorneos(
        tors.map((t) => ({
          value: t.id,
          label: t.nombre || t.id,
        })),
      );
    })();
  }, []);

  // Al cambiar de rol o categoria, aseguramos que la categoria activa sea valida.
  useEffect(() => {
    if (!categoriasDisponibles.includes(categoriaDest)) {
      setCategoriaDest(categoriasDisponibles[0]);
    }
  }, [categoriasDisponibles, categoriaDest]);

  // Admin de club: forzamos el filtro al club del perfil. No debe poder
  // seleccionar otros clubes en el dropdown de audiencia.
  useEffect(() => {
    if (rol === "admin_club" && profile?.club_id) {
      setClubId(profile.club_id);
    }
  }, [rol, profile?.club_id]);

  // Etiqueta del club forzado para admin_club (mostrada en modo read-only).
  const clubForzadoLabel = useMemo(() => {
    if (rol !== "admin_club" || !profile?.club_id) return "";
    const found = clubes.find((c) => c.value === profile.club_id);
    return found?.label || "Tu club";
  }, [rol, profile?.club_id, clubes]);

  /**
   * Provincia forzada por rol. El admin provincial NO debe poder cambiarla:
   * el backend valida y descarta cualquier envio fuera de su provincia. Para
   * evitar UX confusa, la mostramos read-only en el frontend tambien.
   */
  const provinciaForzada = useMemo(() => {
    if (rol === "admin_provincial") {
      return (profile?.lugar_residencia || "").trim();
    }
    return "";
  }, [rol, profile?.lugar_residencia]);

  // Sincronizamos el filtro `provincia` con la provincia forzada del rol.
  useEffect(() => {
    if (provinciaForzada) setProvincia(provinciaForzada);
  }, [provinciaForzada]);

  /** Normaliza texto (sin acentos, minusculas) para comparar provincias. */
  const normalizarTexto = (v?: string | null) =>
    (v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  /**
   * Dropdowns filtrados por alcance de rol. El provincial solo puede apuntar
   * a asociaciones y clubes de su misma provincia (validacion espejada en backend).
   */
  const asociacionesDisponibles = useMemo(() => {
    if (!provinciaForzada) return asociaciones;
    const target = normalizarTexto(provinciaForzada);
    return asociaciones.filter(
      (a) => normalizarTexto(a.provincia) === target,
    );
  }, [asociaciones, provinciaForzada]);

  const clubesDisponibles = useMemo(() => {
    if (!provinciaForzada) return clubes;
    const target = normalizarTexto(provinciaForzada);
    return clubes.filter((c) => normalizarTexto(c.provincia) === target);
  }, [clubes, provinciaForzada]);

  /**
   * Resumen textual de filtros aplicados. Se muestra en la preview antes de
   * enviar (requerido por observaciones: "los usuarios deben poder ver los
   * filtros aplicados y confirmar antes del envio").
   */
  const resumenFiltros = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    const audienciaLabel = AUDIENCIA_LABELS[audienciaTipo] || audienciaTipo;
    items.push({ label: "Audiencia", value: audienciaLabel });

    if (audienciaTipo === "lista") {
      const nombre = listas.find((l) => l.id === listaId)?.nombre;
      if (nombre) items.push({ label: "Lista", value: nombre });
    }

    if (provincia) {
      items.push({
        label: "Provincia",
        value: provinciaForzada
          ? `${provincia} (forzada por rol)`
          : provincia,
      });
    }

    if (asociacionId) {
      const nombre =
        asociaciones.find((a) => a.value === asociacionId)?.label ||
        asociacionId;
      items.push({ label: "Asociación", value: nombre });
    }

    if (clubId) {
      const nombre =
        clubes.find((c) => c.value === clubId)?.label || clubId;
      items.push({
        label: "Club",
        value:
          rol === "admin_club" ? `${nombre} (forzado por rol)` : nombre,
      });
    }

    if (torneoId && audienciaTipo === "inscritos_torneo") {
      const nombre =
        torneos.find((t) => t.value === torneoId)?.label || torneoId;
      items.push({ label: "Torneo", value: nombre });
    }

    if (
      categoriaPadel &&
      (audienciaTipo === "jugadores_provincia" ||
        audienciaTipo === "jugadores_asociacion" ||
        audienciaTipo === "jugadores_club" ||
        audienciaTipo === "plataforma")
    ) {
      items.push({ label: "Categoría", value: categoriaPadel });
    }

    if (
      licenciaEstado !== "" &&
      (audienciaTipo === "jugadores_provincia" ||
        audienciaTipo === "jugadores_asociacion" ||
        audienciaTipo === "jugadores_club" ||
        audienciaTipo === "inscritos_torneo" ||
        audienciaTipo === "plataforma")
    ) {
      items.push({
        label: "Licencia",
        value:
          licenciaEstado === "vigente"
            ? "Con licencia vigente"
            : "Sin licencia vigente",
      });
    }

    return items;
  }, [
    audienciaTipo,
    provincia,
    provinciaForzada,
    asociacionId,
    asociaciones,
    clubId,
    clubes,
    torneoId,
    torneos,
    categoriaPadel,
    licenciaEstado,
    listaId,
    listas,
    rol,
  ]);

  // Al cambiar de categoria, elegimos el primer tipo disponible por defecto.
  useEffect(() => {
    if (!audienciasDisponibles.includes(audienciaTipo)) {
      setAudienciaTipo(
        audienciasDisponibles[0] || ("jugadores_provincia" as const),
      );
      setPreview(null);
    }
  }, [audienciasDisponibles, audienciaTipo]);


  useEffect(() => {
    const q = busquedaMiembro.trim();
    if (listaTipo !== "manual") return;

    if (q.length < 2) {
      setResultadosBusqueda([]);
      setBuscandoContactos(false);
      return;
    }

    setBuscandoContactos(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await ComunicacionesService.buscarContactos(q);
          setResultadosBusqueda(data);
        } catch (err) {
          setResultadosBusqueda([]);
          sileo.error({
            title: "Búsqueda",
            description: errorMessage(err, "No se pudieron buscar contactos."),
          });
        } finally {
          setBuscandoContactos(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(handle);
  }, [busquedaMiembro, listaTipo]);

  const handlePreview = async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const data = await ComunicacionesService.previewAudiencia({
        audiencia_tipo: audienciaTipo,
        filtros: buildFiltros(),
        lista_id: audienciaTipo === "lista" ? listaId || null : null,
      });
      setPreview(data);
      if (data.total === 0) {
        sileo.warning({
          title: "Sin destinatarios",
          description: "Ajustá los filtros o elegí otra audiencia.",
        });
      }
    } catch (err) {
      sileo.error({
        title: "Preview falló",
        description: errorMessage(err, "No se pudo calcular la audiencia."),
      });
    } finally {
      setPreviewing(false);
    }
  };

  const confirmarEnvio = () => {
    if (!titulo.trim() || !mensaje.trim()) {
      sileo.warning({
        title: "Completá el mensaje",
        description: "Título y mensaje son obligatorios.",
      });
      return;
    }
    if (audienciaTipo === "lista" && !listaId) {
      sileo.warning({
        title: "Elegí una lista",
        description: "Seleccioná una lista guardada para enviar.",
      });
      return;
    }

    const total = preview?.total ?? 0;
    // El PDF de observaciones 13-9-2026 exige confirmacion reforzada para
    // envios masivos (audiencia "Toda la plataforma" o mas de ~500 personas).
    const esMasivo =
      audienciaTipo === "plataforma" ||
      total > CONFIRMACION_REFORZADA_UMBRAL;

    const doEnviar = async () => {
      setEnviando(true);
      try {
        const result = await ComunicacionesService.enviarCampana({
          titulo: titulo.trim(),
          mensaje: mensaje.trim(),
          audiencia_tipo: audienciaTipo,
          filtros: buildFiltros(),
          lista_id: audienciaTipo === "lista" ? listaId || null : null,
          action_url: actionUrl.trim() || null,
        });
        sileo.success({
          title: "Campaña enviada",
          description: `${result.total_enviados} de ${result.total_destinatarios} notificaciones creadas.`,
        });
        setTitulo("");
        setMensaje("");
        setActionUrl("");
        setPreview(null);
        setFeedback((p) => ({ ...p, isOpen: false }));
        setTab("historial");
        void cargarCampanas();
      } catch (err) {
        sileo.error({
          title: "No se pudo enviar",
          description: errorMessage(err, "Error al enviar la campaña."),
        });
        setFeedback((p) => ({ ...p, isOpen: false }));
      } finally {
        setEnviando(false);
      }
    };

    if (esMasivo) {
      // Modal reforzado: pide tipear la palabra "CONFIRMAR".
      setFeedback({
        isOpen: true,
        type: "danger",
        title:
          audienciaTipo === "plataforma"
            ? "¿Enviar a TODA la plataforma?"
            : `¿Enviar a ${total} destinatarios?`,
        description:
          "Este es un envio masivo. Verifica que el titulo, mensaje y audiencia sean correctos. Escribi CONFIRMAR abajo para habilitar el envio.",
        confirmText: "Enviar ahora",
        cancelText: "Cancelar",
        showInput: true,
        inputLabel: 'Escribi "CONFIRMAR" para habilitar el envio',
        inputPlaceholder: "CONFIRMAR",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
        onConfirm: async (inputValue) => {
          if ((inputValue || "").trim().toUpperCase() !== "CONFIRMAR") {
            sileo.warning({
              title: "Escribi CONFIRMAR",
              description:
                "Necesitamos que tipees la palabra CONFIRMAR para autorizar un envio masivo.",
            });
            return;
          }
          await doEnviar();
        },
      });
      return;
    }

    setFeedback({
      isOpen: true,
      type: "warning",
      title: "¿Enviar campaña?",
      description: total
        ? `Se intentará notificar a ${total} destinatario${total === 1 ? "" : "s"}. Quienes tengan push desactivado no recibirán el aviso.`
        : "Vas a enviar la campaña a la audiencia seleccionada. Recomendamos previsualizar antes.",
      confirmText: "Enviar ahora",
      cancelText: "Cancelar",
      onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      onConfirm: doEnviar,
    });
  };

  const resetListaForm = () => {
    setListaEditandoId(null);
    setListaNombre("");
    setListaDesc("");
    setListaTipo("manual");
    setListaEtiquetas([]);
    setListaProvincia("");
    setListaAsociacionId("");
    setListaClubId("");
    setMiembroIds([]);
    setMiembrosSeleccionados([]);
    setBusquedaMiembro("");
    setResultadosBusqueda([]);
  };

  const toggleEtiqueta = (etiqueta: ComunicacionesEtiqueta) => {
    setListaEtiquetas((prev) =>
      prev.includes(etiqueta)
        ? prev.filter((e) => e !== etiqueta)
        : [...prev, etiqueta],
    );
  };

  const handleEditarLista = async (id: string) => {
    setCargandoListaDetalle(true);
    setTab("listas");
    try {
      const lista = await ComunicacionesService.obtenerLista(id);
      setListaEditandoId(lista.id);
      setListaNombre(lista.nombre);
      setListaDesc(lista.descripcion || "");
      setListaTipo(lista.tipo);
      setListaEtiquetas(lista.etiquetas ?? []);
      setListaProvincia(lista.filtros?.provincias?.[0] || "");
      setListaAsociacionId(lista.filtros?.asociacion_ids?.[0] || "");
      setListaClubId(lista.filtros?.club_ids?.[0] || "");
      setBusquedaMiembro("");
      setResultadosBusqueda([]);

      if (lista.miembros && lista.miembros.length > 0) {
        const contactos: ComunicacionesContactoBusqueda[] = lista.miembros.map(
          (m) => ({
            id: m.perfil_id,
            nombre: m.nombre,
            apellido: m.apellido,
            email: m.email,
            dni: null,
            rol: null,
            lugar_residencia: null,
            club_id: null,
            avatar_url: m.avatar_url,
          }),
        );
        setMiembroIds(contactos.map((c) => c.id));
        setMiembrosSeleccionados(contactos);
      } else {
        setMiembroIds([]);
        setMiembrosSeleccionados([]);
      }
    } catch (err) {
      sileo.error({
        title: "Error",
        description: errorMessage(err, "No se pudo cargar la lista."),
      });
    } finally {
      setCargandoListaDetalle(false);
    }
  };

  const handleGuardarLista = async () => {
    if (!listaNombre.trim()) {
      sileo.warning({
        title: "Nombre requerido",
        description: "Poné un nombre a la lista.",
      });
      return;
    }

    setGuardandoLista(true);
    try {
      const filtros: ComunicacionesFiltros = {};
      if (listaTipo === "dinamica") {
        // Si el rol fuerza provincia, la aplicamos aunque el usuario no la haya
        // seleccionado (el dropdown esta oculto).
        const provinciaLista = provinciaForzada || listaProvincia;
        if (provinciaLista) filtros.provincias = [provinciaLista];
        if (listaAsociacionId) filtros.asociacion_ids = [listaAsociacionId];
        if (listaClubId) filtros.club_ids = [listaClubId];
        filtros.solo_rol_usuario = true;
      }

      const payload = {
        nombre: listaNombre.trim(),
        tipo: listaTipo,
        descripcion: listaDesc.trim() || null,
        etiquetas: listaEtiquetas,
        filtros: listaTipo === "dinamica" ? filtros : {},
        miembro_ids: listaTipo === "manual" ? miembroIds : undefined,
      };

      if (listaEditandoId) {
        await ComunicacionesService.actualizarLista(listaEditandoId, payload);
        sileo.success({ title: "Lista actualizada" });
      } else {
        await ComunicacionesService.crearLista(payload);
        sileo.success({ title: "Lista creada" });
      }

      resetListaForm();
      await cargarListas();
    } catch (err) {
      sileo.error({
        title: "Error",
        description: errorMessage(
          err,
          listaEditandoId
            ? "No se pudo actualizar la lista."
            : "No se pudo crear la lista.",
        ),
      });
    } finally {
      setGuardandoLista(false);
    }
  };

  const handleEliminarLista = (lista: ComunicacionesLista) => {
    setFeedback({
      isOpen: true,
      type: "danger",
      title: "¿Eliminar lista?",
      description: `Se borrará “${lista.nombre}”. Las campañas ya enviadas conservan su historial.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      onConfirm: async () => {
        try {
          await ComunicacionesService.eliminarLista(lista.id);
          sileo.success({ title: "Lista eliminada" });
          setFeedback((p) => ({ ...p, isOpen: false }));
          if (listaId === lista.id) setListaId("");
          if (listaEditandoId === lista.id) resetListaForm();
          await cargarListas();
        } catch (err) {
          sileo.error({
            title: "Error",
            description: errorMessage(err, "No se pudo eliminar."),
          });
          setFeedback((p) => ({ ...p, isOpen: false }));
        }
      },
    });
  };

  const toggleMiembro = (contacto: ComunicacionesContactoBusqueda) => {
    setMiembroIds((prev) => {
      const exists = prev.includes(contacto.id);
      if (exists) {
        setMiembrosSeleccionados((sel) =>
          sel.filter((s) => s.id !== contacto.id),
        );
        return prev.filter((id) => id !== contacto.id);
      }
      setMiembrosSeleccionados((sel) =>
        sel.some((s) => s.id === contacto.id) ? sel : [...sel, contacto],
      );
      return [...prev, contacto.id];
    });
  };

  const provinciasOpts = PROVINCIAS_ARG.map((p) => ({
    value: p.value,
    label: p.label,
  }));

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-6 md:px-10 md:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-11 rounded-2xl bg-brand-chartreuse/15 flex items-center justify-center">
              <Megaphone className="size-5 text-brand-chartreuse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-white tracking-tight">
                Comunicaciones
              </h1>
              <p className="text-sm text-gray-500">
                Listas de contactos y campañas masivas institucionales
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-brand-card border border-brand-white/5 w-full sm:w-fit overflow-x-auto">
        {(
          [
            { id: "enviar" as const, label: "Enviar", icon: Send },
            { id: "listas" as const, label: "Mis listas", icon: ListPlus },
            { id: "historial" as const, label: "Historial", icon: History },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-brand-chartreuse text-brand-black"
                : "text-gray-400 hover:text-brand-white"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "enviar" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-5 rounded-3xl border border-brand-white/5 bg-gradient-to-br from-brand-card to-brand-black p-6 md:p-8">
            {/* Paso 1 del wizard: categoria de destinatario. */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                1 · Tipo de destinatario
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: "asociaciones" as const,
                      label: "Asociaciones",
                      hint: "Comunicaciones institucionales a asociaciones y agrupaciones provinciales",
                      Icon: Landmark,
                    },
                    {
                      id: "jugadores" as const,
                      label: "Jugadores",
                      hint: "Jugadores federados y participantes de torneos",
                      Icon: Users,
                    },
                    {
                      id: "clubes" as const,
                      label: "Clubes",
                      hint: "Administradores de clubes registrados",
                      Icon: Building2,
                    },
                  ] as const
                )
                  .filter((cat) => categoriasDisponibles.includes(cat.id))
                  .map((cat) => {
                    const active = categoriaDest === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoriaDest(cat.id);
                          setPreview(null);
                          setProvincia("");
                          setAsociacionId("");
                          setClubId("");
                          setTorneoId("");
                          setLicenciaEstado("");
                          setCategoriaPadel("");
                        }}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? "border-brand-chartreuse/50 bg-brand-chartreuse/10"
                            : "border-brand-white/5 bg-brand-black/40 hover:border-brand-white/15"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <cat.Icon className="size-4 text-brand-chartreuse" />
                          <span className="text-sm font-black text-brand-white">
                            {cat.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          {cat.hint}
                        </p>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Paso 2 del wizard: audiencia dentro de la categoria + lista guardada. */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                2 · Audiencia
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {audienciasDisponibles.map((a) => {
                  const Icon =
                    a === "plataforma"
                      ? Globe
                      : a === "inscritos_torneo"
                        ? Trophy
                        : a === "admins_asociaciones"
                          ? Landmark
                          : a === "admins_clubes"
                            ? Building2
                            : a === "jugadores_club"
                              ? Building2
                              : a === "jugadores_provincia"
                                ? MapPin
                                : Users;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setAudienciaTipo(a);
                        setPreview(null);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        audienciaTipo === a
                          ? "border-brand-chartreuse/50 bg-brand-chartreuse/10"
                          : "border-brand-white/5 bg-brand-black/40 hover:border-brand-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="size-3.5 text-brand-chartreuse" />
                        <span className="text-xs font-bold text-brand-white">
                          {AUDIENCIA_LABELS[a]}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {/* Lista guardada disponible en cualquier categoria. */}
                <button
                  type="button"
                  onClick={() => {
                    setAudienciaTipo("lista");
                    setPreview(null);
                  }}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    audienciaTipo === "lista"
                      ? "border-brand-chartreuse/50 bg-brand-chartreuse/10"
                      : "border-brand-white/5 bg-brand-black/40 hover:border-brand-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ListPlus className="size-3.5 text-brand-chartreuse" />
                    <span className="text-xs font-bold text-brand-white">
                      Lista guardada
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {(audienciaTipo === "jugadores_provincia" ||
              audienciaTipo === "admins_asociaciones" ||
              audienciaTipo === "admins_clubes") && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Provincia
                </label>
                {provinciaForzada ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-black/60 border border-brand-white/10 text-sm text-brand-white">
                    <MapPin className="size-4 text-brand-chartreuse shrink-0" />
                    <span className="font-semibold">{provinciaForzada}</span>
                 
                  </div>
                ) : (
                  <CustomDropdown
                    value={provincia}
                    onChange={(v) => {
                      setProvincia(v);
                      setPreview(null);
                    }}
                    options={[
                      { value: "", label: "Todas (según tu alcance)" },
                      ...provinciasOpts,
                    ]}
                    placeholder="Provincia"
                  />
                )}
              </div>
            )}

            {audienciaTipo === "admins_clubes" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Filtrar por club (opcional)
                </label>
                <CustomDropdown
                  value={clubId}
                  onChange={(v) => {
                    setClubId(v);
                    setPreview(null);
                  }}
                  options={[
                    { value: "", label: "Todos los clubes del alcance" },
                    ...clubesDisponibles,
                  ]}
                  placeholder="Club"
                />
              </div>
            )}

            {audienciaTipo === "jugadores_asociacion" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Asociación
                </label>
                <CustomDropdown
                  value={asociacionId}
                  onChange={(v) => {
                    setAsociacionId(v);
                    setPreview(null);
                  }}
                  options={[
                    { value: "", label: "Seleccioná asociación" },
                    ...asociacionesDisponibles,
                  ]}
                  placeholder="Asociación"
                />
                {provinciaForzada && (
                  <p className="text-[11px] text-gray-500">
                    Solo podés apuntar a asociaciones de {provinciaForzada}.
                  </p>
                )}
              </div>
            )}

            {audienciaTipo === "jugadores_club" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Club
                </label>
                {rol === "admin_club" ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-black/60 border border-brand-white/10 text-sm text-brand-white">
                    <Building2 className="size-4 text-brand-chartreuse shrink-0" />
                    <span className="font-semibold">
                      {clubForzadoLabel || "Tu club"}
                    </span>
                  
                  </div>
                ) : (
                  <>
                    <CustomDropdown
                      value={clubId}
                      onChange={(v) => {
                        setClubId(v);
                        setPreview(null);
                      }}
                      options={[
                        { value: "", label: "Seleccioná club" },
                        ...clubesDisponibles,
                      ]}
                      placeholder="Club"
                    />
                    {provinciaForzada && (
                      <p className="text-[11px] text-gray-500">
                        Solo podés apuntar a clubes de {provinciaForzada}.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {audienciaTipo === "inscritos_torneo" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Torneo
                </label>
                <CustomDropdown
                  value={torneoId}
                  onChange={(v) => {
                    setTorneoId(v);
                    setPreview(null);
                  }}
                  options={[
                    { value: "", label: "Seleccioná torneo" },
                    ...torneos,
                  ]}
                  placeholder="Torneo"
                />
              </div>
            )}

            {audienciaTipo === "lista" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Lista
                </label>
                <CustomDropdown
                  value={listaId}
                  onChange={(v) => {
                    setListaId(v);
                    setPreview(null);
                  }}
                  options={[
                    { value: "", label: "Seleccioná lista" },
                    ...listas.map((l) => ({
                      value: l.id,
                      label: `${l.nombre} (${l.tipo})`,
                    })),
                  ]}
                  placeholder="Lista"
                />
              </div>
            )}

            {esAudienciaJugadores && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(audienciaTipo === "jugadores_provincia" ||
                  audienciaTipo === "jugadores_asociacion" ||
                  audienciaTipo === "jugadores_club") && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Categoría pádel
                    </label>
                    <CustomDropdown
                      value={categoriaPadel}
                      onChange={(v) => {
                        setCategoriaPadel(v);
                        setPreview(null);
                      }}
                      options={[
                        { value: "", label: "Todas las categorías" },
                        ...NIVELES_PADEL.map((n) => ({
                          value: n.value,
                          label: n.label,
                        })),
                      ]}
                      placeholder="Categoría"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Licencia
                  </label>
                  <CustomDropdown
                    value={licenciaEstado}
                    onChange={(v) => {
                      setLicenciaEstado(
                        (v as ComunicacionesLicenciaEstado | "") || "",
                      );
                      setPreview(null);
                    }}
                    options={[
                      { value: "", label: "Sin filtro por licencia" },
                      { value: "vigente", label: "Con licencia vigente" },
                      { value: "sin_licencia", label: "Sin licencia vigente" },
                    ]}
                    placeholder="Licencia"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Título
              </label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={120}
                placeholder="Ej. Nuevo torneo regional"
                className="w-full px-4 py-3 rounded-xl bg-brand-black border border-brand-white/10 text-sm text-brand-white placeholder:text-gray-600 focus:outline-none focus:border-brand-chartreuse/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Mensaje
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Texto que verán en la notificación…"
                className="w-full px-4 py-3 rounded-xl bg-brand-black border border-brand-white/10 text-sm text-brand-white placeholder:text-gray-600 focus:outline-none focus:border-brand-chartreuse/50 resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Link opcional
              </label>
              <input
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="/ranking o https://padelnexus.netlify.app/ranking"
                className="w-full px-4 py-3 rounded-xl bg-brand-black border border-brand-white/10 text-sm text-brand-white placeholder:text-gray-600 focus:outline-none focus:border-brand-chartreuse/50"
              />
              <p className="text-[11px] text-gray-500">
                Podés pegar una ruta interna (`/ranking`) o la URL completa del
                sitio; si es de Padel Nexus se abre dentro de la app.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handlePreview()}
                disabled={previewing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-brand-white/10 text-sm font-bold text-brand-white hover:bg-brand-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Eye className="size-4" />
                {previewing ? "Calculando…" : "Previsualizar audiencia"}
              </button>
              <button
                type="button"
                onClick={confirmarEnvio}
                disabled={enviando}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-chartreuse text-brand-black text-sm font-black hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Send className="size-4" />
                {enviando ? "Enviando…" : "Enviar campaña"}
              </button>
            </div>
          </div>

          <div className="xl:col-span-4 space-y-4">
            <div className="rounded-3xl border border-brand-white/5 bg-brand-card p-6 space-y-4">
              <h3 className="text-sm font-black text-brand-white">Vista previa</h3>
              <div className="rounded-2xl border border-brand-chartreuse/20 bg-brand-chartreuse/5 p-4 space-y-2">
                <p className="text-sm font-bold text-brand-white">
                  {titulo || "Título de la campaña"}
                </p>
                <p className="text-xs text-gray-400 whitespace-pre-line">
                  {mensaje || "El mensaje aparecerá acá."}
                </p>
                {actionUrl && (
                  <p className="text-[10px] text-brand-chartreuse font-mono truncate">
                    → {actionUrl}
                  </p>
                )}
              </div>

              {/* Resumen de filtros: se ve siempre, con o sin preview */}
              <div className="rounded-2xl border border-brand-white/10 bg-brand-black/40 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Filtros aplicados
                </p>
                <ul className="space-y-1">
                  {resumenFiltros.map((f) => (
                    <li
                      key={f.label}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className="text-gray-500 shrink-0">
                        {f.label}:
                      </span>
                      <span className="text-brand-white font-semibold break-words">
                        {f.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {preview ? (
                <div className="space-y-3">
                  <p className="text-3xl font-black text-brand-chartreuse">
                    {preview.total}
                  </p>
                  <p className="text-xs text-gray-500">
                    destinatarios estimados
                  </p>
                  {preview.sample.length > 0 && (
                    <ul className="space-y-1.5">
                      {preview.sample.map((s) => (
                        <li
                          key={s.id}
                          className="text-xs text-gray-400 truncate"
                        >
                          {nombrePersona(s)}
                          {s.rol ? ` · ${s.rol}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  Previsualizá para ver cuántas personas reciben el aviso.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "listas" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 rounded-3xl border border-brand-white/5 bg-brand-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {listaEditandoId ? (
                  <Pencil className="size-4 text-brand-chartreuse" />
                ) : (
                  <Plus className="size-4 text-brand-chartreuse" />
                )}
                <h3 className="text-sm font-black">
                  {listaEditandoId ? "Editar lista" : "Nueva lista"}
                </h3>
              </div>
              {listaEditandoId && (
                <button
                  type="button"
                  onClick={resetListaForm}
                  className="text-[11px] font-bold text-gray-400 hover:text-brand-white cursor-pointer"
                >
                  Nueva lista
                </button>
              )}
            </div>

            {cargandoListaDetalle ? (
              <div className="space-y-2">
                <div className="h-12 rounded-xl bg-brand-white/5 animate-pulse" />
                <div className="h-20 rounded-xl bg-brand-white/5 animate-pulse" />
              </div>
            ) : (
              <>
            <input
              value={listaNombre}
              onChange={(e) => setListaNombre(e.target.value)}
              placeholder="Nombre (ej. Contactos institucionales Cuyo)"
              className="w-full px-4 py-3 rounded-xl bg-brand-black border border-brand-white/10 text-sm text-brand-white placeholder:text-gray-600 focus:outline-none focus:border-brand-chartreuse/50"
            />
            <textarea
              value={listaDesc}
              onChange={(e) => setListaDesc(e.target.value)}
              rows={2}
              placeholder="Descripción opcional"
              className="w-full px-4 py-3 rounded-xl bg-brand-black border border-brand-white/10 text-sm text-brand-white placeholder:text-gray-600 focus:outline-none focus:border-brand-chartreuse/50 resize-y"
            />

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {ETIQUETAS_OPTS.map((e) => {
                  const active = listaEtiquetas.includes(e);
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => toggleEtiqueta(e)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer capitalize transition-all ${
                        active
                          ? "bg-brand-chartreuse/15 border-brand-chartreuse/40 text-brand-chartreuse"
                          : "border-brand-white/10 text-gray-400"
                      }`}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["manual", "dinamica"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={!!listaEditandoId}
                  onClick={() => setListaTipo(t)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer border disabled:cursor-default ${
                    listaTipo === t
                      ? "bg-brand-chartreuse/15 border-brand-chartreuse/40 text-brand-chartreuse"
                      : "border-brand-white/10 text-gray-400"
                  } ${listaEditandoId ? "opacity-70" : ""}`}
                >
                  {t === "manual" ? "Manual" : "Dinámica"}
                </button>
              ))}
            </div>

            {listaTipo === "dinamica" ? (
              <div className="space-y-3">
                {provinciaForzada ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-black/60 border border-brand-white/10 text-sm text-brand-white">
                    <MapPin className="size-4 text-brand-chartreuse shrink-0" />
                    <span className="font-semibold">{provinciaForzada}</span>
                  
                  </div>
                ) : (
                  <CustomDropdown
                    value={listaProvincia}
                    onChange={setListaProvincia}
                    options={[
                      { value: "", label: "Provincia (opcional)" },
                      ...provinciasOpts,
                    ]}
                    placeholder="Provincia"
                  />
                )}
                <CustomDropdown
                  value={listaAsociacionId}
                  onChange={setListaAsociacionId}
                  options={[
                    { value: "", label: "Asociación (opcional)" },
                    ...asociacionesDisponibles,
                  ]}
                  placeholder="Asociación"
                />
                <CustomDropdown
                  value={listaClubId}
                  onChange={setListaClubId}
                  options={[
                    { value: "", label: "Club (opcional)" },
                    ...clubesDisponibles,
                  ]}
                  placeholder="Club"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Agregar contactos
                  </label>
                  <input
                    value={busquedaMiembro}
                    onChange={(e) => setBusquedaMiembro(e.target.value)}
                    placeholder="Nombre, apellido, email o DNI…"
                    className="w-full px-4 py-2.5 rounded-xl bg-brand-black border border-brand-white/10 text-sm text-brand-white placeholder:text-gray-600 focus:outline-none focus:border-brand-chartreuse/50"
                  />
                  <p className="text-[11px] text-gray-500">
                    Buscá por <span className="text-gray-300">nombre</span>,{" "}
                    <span className="text-gray-300">apellido</span>,{" "}
                    <span className="text-gray-300">email</span> o{" "}
                    <span className="text-gray-300">DNI</span> (mín. 2
                    caracteres).
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-brand-white/5 p-2">
                  {busquedaMiembro.trim().length < 2 ? (
                    <p className="text-[11px] text-gray-600 p-2">
                      Escribí al menos 2 caracteres para buscar jugadores o
                      contactos institucionales.
                    </p>
                  ) : buscandoContactos ? (
                    <p className="text-[11px] text-gray-500 p-2 animate-pulse">
                      Buscando…
                    </p>
                  ) : resultadosBusqueda.length === 0 ? (
                    <p className="text-[11px] text-gray-600 p-2">
                      No hay resultados para “{busquedaMiembro.trim()}”.
                    </p>
                  ) : (
                    resultadosBusqueda.map((u) => {
                      const checked = miembroIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-brand-white/5 cursor-pointer text-xs text-gray-300"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMiembro(u)}
                            className="accent-brand-chartreuse shrink-0"
                          />
                          <ContactoAvatar avatarUrl={u.avatar_url} size={32} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-brand-white">
                              {nombrePersona(u)}
                            </span>
                            <span className="block truncate text-[10px] text-gray-500">
                              {[u.email, u.dni ? `DNI ${u.dni}` : null, u.rol]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                {miembrosSeleccionados.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {miembrosSeleccionados.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMiembro(m)}
                        className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-[10px] font-bold text-brand-chartreuse cursor-pointer"
                        title="Quitar"
                      >
                        <ContactoAvatar avatarUrl={m.avatar_url} size={18} />
                        {nombrePersona(m)}
                        <Trash2 className="size-2.5" />
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-500">
                  {miembroIds.length} miembro
                  {miembroIds.length === 1 ? "" : "s"} seleccionado
                  {miembroIds.length === 1 ? "" : "s"}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleGuardarLista()}
                disabled={guardandoLista}
                className="w-full py-3 rounded-xl bg-brand-chartreuse text-brand-black text-sm font-black cursor-pointer disabled:opacity-50"
              >
                {guardandoLista
                  ? "Guardando…"
                  : listaEditandoId
                    ? "Guardar cambios"
                    : "Crear lista"}
              </button>
              {listaEditandoId && (
                <button
                  type="button"
                  onClick={resetListaForm}
                  disabled={guardandoLista}
                  className="w-full py-2.5 rounded-xl border border-brand-white/10 text-sm font-bold text-gray-400 hover:text-brand-white cursor-pointer disabled:opacity-50"
                >
                  Cancelar edición
                </button>
              )}
            </div>
              </>
            )}
          </div>

          <div className="xl:col-span-7 rounded-3xl border border-brand-white/5 bg-brand-card p-6">
            <h3 className="text-sm font-black mb-4">Tus listas</h3>
            {loadingListas ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-brand-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : listas.length === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no tenés listas. Creá una para reutilizar audiencias de
                marketing o contactos institucionales.
              </p>
            ) : (
              <ul className="space-y-2">
                {listas.map((lista) => (
                  <li
                    key={lista.id}
                    className={`flex items-start justify-between gap-3 p-4 rounded-xl border bg-brand-black/40 transition-colors ${
                      listaEditandoId === lista.id
                        ? "border-brand-chartreuse/40"
                        : "border-brand-white/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void handleEditarLista(lista.id)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <p className="text-sm font-bold text-brand-white truncate">
                        {lista.nombre}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {lista.tipo === "manual"
                          ? `Manual · ${lista.miembros_count ?? 0} miembros`
                          : "Dinámica · filtros guardados"}
                      </p>
                      {(lista.etiquetas?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {lista.etiquetas.map((e) => (
                            <span
                              key={e}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                      {lista.descripcion && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {lista.descripcion}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleEditarLista(lista.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-brand-chartreuse hover:bg-brand-chartreuse/10 cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarLista(lista)}
                        className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "historial" && (
        <div className="rounded-3xl border border-brand-white/5 bg-brand-card p-6">
          <h3 className="text-sm font-black mb-4">Campañas enviadas</h3>
          {loadingCampanas ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-brand-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : campanas.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aún no enviaste campañas desde este módulo.
            </p>
          ) : (
            <ul className="space-y-3">
              {campanas.map((c) => {
                const remitenteNombre = c.creador
                  ? nombrePersona({
                      nombre: c.creador.nombre,
                      apellido: c.creador.apellido,
                      email: c.creador.email,
                    })
                  : "Usuario desconocido";
                const remitenteRol = c.creador?.rol;
                return (
                  <li
                    key={c.id}
                    className="p-4 rounded-xl border border-brand-white/5 bg-brand-black/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-brand-white truncate">
                          {c.titulo}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {c.mensaje}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-600 shrink-0">
                        {new Date(c.created_at).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                      <span className="px-2 py-0.5 rounded-md bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20">
                        {AUDIENCIA_LABELS[c.audiencia_tipo] || c.audiencia_tipo}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-brand-white/5 text-gray-400 border border-brand-white/10">
                        {c.total_enviados}/{c.total_destinatarios} enviados
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md bg-brand-white/5 text-gray-400 border border-brand-white/10 normal-case tracking-normal"
                        title={remitenteRol || undefined}
                      >
                        Enviado por: {remitenteNombre}
                        {remitenteRol ? ` · ${remitenteRol}` : ""}
                      </span>
                      {c.action_url && (
                        <span className="px-2 py-0.5 rounded-md bg-brand-white/5 text-gray-500 border border-brand-white/10 font-mono normal-case tracking-normal">
                          {c.action_url}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <FeedbackModal {...feedback} isLoading={enviando} />
    </div>
  );
}
