"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Map,
  Edit2,
  Power,
  Eye,
  ShieldCheck,
  X,
} from "lucide-react";
import { AsociacionesService, Asociacion } from "@/utils/services/asociaciones";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import { sileo } from "sileo";

const MapaClubs = dynamic(() => import("@/components/reservas/MapaClubs"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-brand-card/50 rounded-2xl flex items-center justify-center text-gray-500 font-semibold animate-pulse">
      Cargando Mapa de Sedes Institucionales...
    </div>
  ),
});

const defaultUserLocation = { lat: -34.6037, lng: -58.3816 };

export default function PadrónAsociacionesPage() {
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [provinciaFilter, setProvinciaFilter] = useState("Todas");
  const [viewMode, setViewMode] = useState<"cards" | "tabla" | "mapa">("cards");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsociacion, setSelectedAsociacion] =
    useState<Asociacion | null>(null);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "warning",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const [form, setForm] = useState({
    nombre: "",
    sigla: "",
    tipo: "asociacion" as "asociacion" | "agrupacion" | "federacion",
    provincia: "Buenos Aires",
    localidad: "",
    direccion: "",
    telefono: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAsociaciones();
  }, [provinciaFilter]);

  const fetchAsociaciones = async () => {
    try {
      setLoading(true);
      const data = await AsociacionesService.getAll(search, provinciaFilter);
      setAsociaciones(data);
    } catch (err) {
      console.error("Error al cargar asociaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setForm({
      nombre: "",
      sigla: "",
      tipo: "asociacion",
      provincia: "Buenos Aires",
      localidad: "",
      direccion: "",
      telefono: "",
      email: "",
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, a: Asociacion) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedAsociacion(a);
    setForm({
      nombre: a.nombre || "",
      sigla: a.sigla || "",
      tipo: a.tipo || "asociacion",
      provincia: a.provincia || "Buenos Aires",
      localidad: a.localidad || "",
      direccion: a.direccion || "",
      telefono: a.telefono || "",
      email: a.email || "",
    });
    setShowEditModal(true);
  };

  const requestToggleEstado = (e: React.MouseEvent, a: Asociacion) => {
    e.stopPropagation();
    e.preventDefault();
    const esActivo = (a.estado ?? a.estado_aprobacion) === "activo";
    const nuevoEstado = esActivo ? "inactivo" : "activo";

    setFeedbackModal({
      isOpen: true,
      title: esActivo ? "¿Inhabilitar Asociación?" : "¿Habilitar Asociación?",
      description: esActivo
        ? `¿Confirmás que querés inhabilitar a ${a.nombre}? Las competencias y licencias asociadas permanecerán pausadas.`
        : `¿Confirmás que querés habilitar a ${a.nombre} como entidad reguladora activa?`,
      type: esActivo ? "warning" : "info",
      confirmText: esActivo ? "Sí, Inhabilitar" : "Sí, Habilitar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        try {
          await AsociacionesService.cambiarEstado(a.id, nuevoEstado);
          sileo.success({
            title: esActivo ? "Entidad Inhabilitada" : "Entidad Habilitada",
            description: `${a.nombre} ahora se encuentra en estado ${nuevoEstado}.`,
          });
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
          fetchAsociaciones();
        } catch (err: any) {
          sileo.error({
            title: "Error",
            description: err.message || "No se pudo cambiar el estado.",
          });
        }
      },
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.localidad.trim()) {
      sileo.error({
        title: "Campos incompletos",
        description: "Completá el Nombre y Ciudad de la asociación.",
      });
      return;
    }

    try {
      setSaving(true);
      await AsociacionesService.create(form);
      sileo.success({
        title: "Asociación Registrada",
        description: `${form.nombre} ha sido dada de alta en el padrón de la Federación FAP.`,
      });
      setShowCreateModal(false);
      fetchAsociaciones();
    } catch (err: any) {
      sileo.error({
        title: "Error al registrar",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsociacion) return;
    try {
      setSaving(true);
      await AsociacionesService.update(selectedAsociacion.id, form);
      sileo.success({
        title: "Asociación Actualizada",
        description:
          "Los datos institucionales han sido modificados con éxito.",
      });
      setShowEditModal(false);
      fetchAsociaciones();
    } catch (err: any) {
      sileo.error({
        title: "Error al actualizar",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredAsociaciones = asociaciones.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.nombre?.toLowerCase().includes(q) ||
      a.sigla?.toLowerCase().includes(q) ||
      a.localidad?.toLowerCase().includes(q) ||
      a.provincia?.toLowerCase().includes(q);
    const matchProv =
      provinciaFilter === "Todas" || a.provincia === provinciaFilter;
    return matchSearch && matchProv;
  });

  const COORDENADAS_PROVINCIAS: Record<string, { lat: number; lng: number }> = {
    "Buenos Aires": { lat: -34.9214, lng: -57.9545 },
    "CABA": { lat: -34.6037, lng: -58.3816 },
    "Córdoba": { lat: -31.4201, lng: -64.1888 },
    "Santa Fe": { lat: -31.6333, lng: -60.7000 },
    "Mendoza": { lat: -32.8895, lng: -68.8458 },
    "La Rioja": { lat: -29.4131, lng: -66.8558 },
    "Neuquén": { lat: -38.9516, lng: -68.0591 },
    "Tucumán": { lat: -26.8241, lng: -65.2226 },
    "Salta": { lat: -24.7859, lng: -65.4117 },
    "Jujuy": { lat: -24.1858, lng: -65.2995 },
    "Entre Ríos": { lat: -31.7333, lng: -60.5333 },
    "Chaco": { lat: -27.4606, lng: -58.9839 },
    "Corrientes": { lat: -27.4806, lng: -58.8341 },
    "Misiones": { lat: -27.3671, lng: -55.8961 },
    "San Luis": { lat: -33.2950, lng: -66.3356 },
    "San Juan": { lat: -31.5375, lng: -68.5364 },
    "Río Negro": { lat: -40.8135, lng: -62.9967 },
    "Chubut": { lat: -43.3002, lng: -65.1023 },
    "Santa Cruz": { lat: -51.6226, lng: -69.2181 },
    "Tierra del Fuego": { lat: -54.8019, lng: -68.3030 },
    "Santiago del Estero": { lat: -27.7833, lng: -64.2667 },
    "Catamarca": { lat: -28.4696, lng: -65.7852 },
    "La Pampa": { lat: -36.6167, lng: -64.2833 },
    "Formosa": { lat: -26.1775, lng: -58.1781 },
  };

  const clubesParaMapa = filteredAsociaciones.map((a, idx) => {
    let lat = a.latitud;
    let lng = a.longitud;

    if (lat == null || lng == null) {
      const coordsProv = COORDENADAS_PROVINCIAS[a.provincia || "Buenos Aires"] || COORDENADAS_PROVINCIAS["Buenos Aires"];
      // Pequeña dispersión determinística para no solapar marcadores en la misma provincia
      const offset = (idx % 5) * 0.035 - 0.07;
      lat = coordsProv.lat + offset;
      lng = coordsProv.lng + offset;
    }

    return {
      id: a.id,
      nombre: a.nombre,
      latitud: lat,
      longitud: lng,
      direccion: a.direccion || a.localidad,
      localidad: a.localidad,
      provincia: a.provincia,
      canchas: a.torneos_count || 0,
      estado: a.estado || "activo",
    };
  });

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
            <Building2 className="size-4" /> Entidades Afiliadas FAP
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Padrón de Asociaciones y Agrupaciones
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Organizaciones reguladoras del circuito oficial de pádel por
            provincias y regiones.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-sm cursor-pointer w-full sm:w-auto"
          >
            <Plus className="size-4" /> Registrar Asociación
          </button>

          {/* Conmutador de Vistas */}
          <div className="flex items-center bg-[#161616] p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-brand-chartreuse text-brand-black shadow font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Vista Cards"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("tabla")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === "tabla"
                  ? "bg-brand-chartreuse text-brand-black shadow font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Vista Tabla"
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("mapa")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === "mapa"
                  ? "bg-brand-chartreuse text-brand-black shadow font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Sedes Institucionales"
            >
              <Map className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-4 top-3.5 size-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar Asociación, Agrupación o Ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-white/10 text-white pl-11 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-chartreuse/50"
          />
        </div>

        <CustomDropdown
          value={provinciaFilter}
          onChange={setProvinciaFilter}
          options={[
            { value: "Todas", label: "Todas las Provincias" },
            ...PROVINCIAS_ARG.map((p) => ({ value: p.value, label: p.label })),
          ]}
          placeholder="Provincia..."
        />
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold">
          Cargando padrón de asociaciones y agrupaciones...
        </div>
      ) : filteredAsociaciones.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl text-gray-500">
          No hay asociaciones registradas matching los filtros.
        </div>
      ) : viewMode === "mapa" ? (
        <div className="bg-brand-card border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Map className="size-4 text-brand-chartreuse" /> Geolocalización
              de Sedes Institucionales
            </h3>
            <span className="text-xs text-gray-400">
              {clubesParaMapa.length} ubicaciones institucionales
            </span>
          </div>

          <div className="h-96 w-full rounded-2xl overflow-hidden border border-white/10">
            <MapaClubs
              clubes={clubesParaMapa as any}
              userLocation={defaultUserLocation}
              basePath="/dashboard/asociaciones"
              buttonLabel="Ver Asociación / Detalle"
            />
          </div>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAsociaciones.map((a) => {
            const esActivo = (a.estado ?? a.estado_aprobacion) === "activo";
            return (
              <Link
                key={a.id}
                href={`/dashboard/asociaciones/${a.id}`}
                className={`bg-brand-card border rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer ${
                  esActivo
                    ? "border-white/5 hover:border-brand-chartreuse/40"
                    : "border-rose-500/20 bg-black/40 opacity-70"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-12 min-w-14 max-w-22.5 px-2 rounded-2xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center text-brand-chartreuse font-black text-xs group-hover:scale-105 transition-transform overflow-hidden text-ellipsis whitespace-nowrap tracking-tight shrink-0">
                      {a.sigla || a.nombre.slice(0, 3).toUpperCase()}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        esActivo
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {esActivo ? "Activa / Vigente" : "Inhabilitada"}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-white group-hover:text-brand-chartreuse transition-colors mb-1 line-clamp-2 leading-tight">
                    {a.nombre}
                  </h3>

                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-6 truncate">
                    <MapPin className="size-3.5 text-brand-chartreuse shrink-0" />
                    {[a.direccion, a.localidad, a.provincia]
                      .filter(Boolean)
                      .join(", ")}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5 text-xs font-semibold">
                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-500 uppercase block font-bold">
                        Torneos
                      </span>
                      <span className="text-base font-extrabold text-white flex items-center gap-1 mt-0.5">
                        <Trophy className="size-4 text-brand-chartreuse" />{" "}
                        {a.torneos_count || 0}
                      </span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-500 uppercase block font-bold">
                        Jugadores
                      </span>
                      <span className="text-base font-extrabold text-white flex items-center gap-1 mt-0.5">
                        <Users className="size-4 text-purple-400" />{" "}
                        {a.jugadores_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 mt-4 border-t border-white/5">
                  <button
                    onClick={(e) => requestToggleEstado(e, a)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      esActivo
                        ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    <Power className="size-3" />
                    {esActivo ? "Inhabilitar" : "Habilitar"}
                  </button>

                  <button
                    onClick={(e) => handleOpenEdit(e, a)}
                    className="p-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse rounded-xl transition-colors cursor-pointer"
                    title="Editar Asociación"
                  >
                    <Edit2 className="size-4" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* VISTA EN TABLA */
        <div className="bg-[#161616] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-black/30">
                  <th className="px-6 py-4">Asociación / Entidad</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4 text-center">Torneos</th>
                  <th className="px-6 py-4 text-center">Jugadores</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-semibold text-gray-300">
                {filteredAsociaciones.map((a) => {
                  const esActivo =
                    (a.estado ?? a.estado_aprobacion) === "activo";
                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/asociaciones/${a.id}`}
                          className="font-extrabold text-white hover:text-brand-chartreuse transition-colors flex items-center gap-2"
                        >
                          <ShieldCheck className="size-4 text-brand-chartreuse shrink-0" />
                          <span>{a.nombre}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {[a.localidad, a.provincia].filter(Boolean).join(", ")}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-white">
                        {a.torneos_count || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-purple-400">
                        {a.jugadores_count || 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            esActivo
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {esActivo ? "Activa" : "Inhabilitada"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Link
                            href={`/dashboard/asociaciones/${a.id}`}
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors"
                            title="Ver Expediente"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <button
                            onClick={(e) => handleOpenEdit(e, a)}
                            className="p-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse rounded-xl transition-colors cursor-pointer"
                            title="Editar Datos"
                          >
                            <Edit2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear Asociación */}
      {showCreateModal && (
        <FormAsociacionModal
          title="Alta de Nueva Asociación u Agrupación"
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Modal Editar Asociación */}
      {showEditModal && (
        <FormAsociacionModal
          title="Editar Datos de la Asociación"
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* FeedbackModal de Confirmación */}
      <FeedbackModal {...feedbackModal} />
    </div>
  );
}

// Componente Reutilizable FormAsociacionModal
interface FormAsociacionModalProps {
  title: string;
  form: any;
  setForm: (f: any) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function FormAsociacionModal({
  title,
  form,
  setForm,
  saving,
  onSubmit,
  onClose,
}: FormAsociacionModalProps) {
  const [localidadesSugeridas, setLocalidadesSugeridas] = useState<
    { ciudad: string; provincia?: string; detalle: string }[]
  >([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [localidadSearch, setLocalidadSearch] = useState(
    form.localidad || "",
  );
  const [isLocalidadOpen, setIsLocalidadOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalidadSearch(form.localidad || "");
  }, [form.localidad]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocalidadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscador predictivo geográfico en tiempo real para TODA la República Argentina usando Nominatim (OpenStreetMap)
  useEffect(() => {
    if (!localidadSearch.trim() || localidadSearch.length < 2) {
      setLocalidadesSugeridas([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoadingLocalidades(true);
      try {
        // Búsqueda libre a nivel nacional (Argentina) sin sesgar por la provincia por defecto
        const query = `${localidadSearch.trim()}, Argentina`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query,
          )}&countrycodes=ar&addressdetails=1&limit=10`,
          {
            headers: {
              "Accept-Language": "es",
            },
          },
        );
        const data = await res.json();
        if (active && Array.isArray(data)) {
          const sugerencias = data.map((item: any) => {
            const addr = item.address || {};
            const ciudad =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.suburb ||
              addr.municipality ||
              item.name ||
              item.display_name.split(",")[0];

            let provincia = addr.state || "";
            // Normalizar provincia para hacer match con PROVINCIAS_ARG
            if (provincia.toLowerCase().includes("buenos aires") && !provincia.toLowerCase().includes("ciudad")) {
              provincia = "Buenos Aires";
            } else if (provincia.toLowerCase().includes("ciudad autónoma") || provincia.toLowerCase().includes("caba")) {
              provincia = "CABA";
            } else if (provincia.startsWith("Provincia de ") || provincia.startsWith("Provincia del ")) {
              provincia = provincia.replace(/^Provincia de(l)?\s+/i, "");
            }

            const detalle = [ciudad, addr.county || addr.state_district, provincia || addr.state]
              .filter(Boolean)
              .join(" • ");

            return { ciudad, provincia, detalle };
          });

          // Filtrar duplicados
          const unicas = sugerencias.filter(
            (v, i, self) =>
              self.findIndex((t) => t.ciudad === v.ciudad && t.provincia === v.provincia) === i,
          );
          setLocalidadesSugeridas(unicas);
        }
      } catch (err) {
        console.error("Error en búsqueda predictiva de localidades:", err);
      } finally {
        if (active) setLoadingLocalidades(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [localidadSearch]);

  const handleTelefonoChange = (val: string) => {
    // Sanitización: Sólo permite números, +, -, paréntesis y espacios (bloquea letras)
    const sanitized = val.replace(/[^0-9+\s\-()]/g, "");
    setForm({ ...form, telefono: sanitized });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 w-full max-w-lg shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h3 className="text-xl font-extrabold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Nombre Oficial de la Entidad *
            </label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder="Ej: Asociación de Pádel Bonaerense"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Sigla
              </label>
              <input
                type="text"
                value={form.sigla}
                onChange={(e) =>
                  setForm({ ...form, sigla: e.target.value.toUpperCase() })
                }
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                placeholder="Ej: APB"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Tipo de Organismo
              </label>
              <CustomDropdown
                value={form.tipo}
                onChange={(val) => setForm({ ...form, tipo: val as any })}
                options={[
                  { value: "asociacion", label: "Asociación Dirigente" },
                  { value: "agrupacion", label: "Agrupación Regional" },
                  { value: "federacion", label: "Federación Provincial" },
                ]}
                placeholder="Tipo..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Provincia
              </label>
              <CustomDropdown
                value={form.provincia}
                onChange={(val) => {
                  setForm({ ...form, provincia: val, localidad: "" });
                  setLocalidadSearch("");
                }}
                options={PROVINCIAS_ARG.map((p) => ({
                  value: p.value,
                  label: p.label,
                }))}
                placeholder="Provincia..."
              />
            </div>
            <div className="relative" ref={dropdownRef}>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Ciudad / Localidad *
              </label>
              <input
                type="text"
                required
                value={localidadSearch}
                onFocus={() => setIsLocalidadOpen(true)}
                onChange={(e) => {
                  setLocalidadSearch(e.target.value);
                  setForm({ ...form, localidad: e.target.value });
                  setIsLocalidadOpen(true);
                }}
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                placeholder={
                  loadingLocalidades
                    ? "Cargando localidades..."
                    : "Buscar localidad..."
                }
              />
              {isLocalidadOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-white/5">
                  {loadingLocalidades ? (
                    <div className="p-3 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                      <MapPin className="size-3.5 animate-bounce text-brand-chartreuse" />
                      Buscando con mapa OpenStreetMap...
                    </div>
                  ) : localidadesSugeridas.length > 0 ? (
                    localidadesSugeridas.map((loc, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setLocalidadSearch(loc.ciudad);
                          const newProv = loc.provincia || form.provincia;
                          setForm({ ...form, localidad: loc.ciudad, provincia: newProv });
                          setIsLocalidadOpen(false);
                        }}
                        className="px-4 py-2.5 hover:bg-brand-chartreuse/10 hover:text-brand-chartreuse text-gray-300 text-xs font-bold cursor-pointer transition-colors flex flex-col gap-0.5"
                      >
                        <div className="flex items-center gap-1.5 text-white">
                          <MapPin className="size-3 text-brand-chartreuse shrink-0" />
                          <span>{loc.ciudad}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 pl-4 font-medium">
                          {loc.detalle}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500 text-xs">
                      {localidadSearch ? "Usar valor ingresado" : "Escribí para buscar ciudades en el mapa..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Dirección de Sede Institucional
            </label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder="Ej: Don Arturo, Bosque Peralta Ramos"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Teléfono Institucional (Solo Números)
              </label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => handleTelefonoChange(e.target.value)}
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                placeholder="Ej: +54 9 223 4567890"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                placeholder="contacto@apbpadel.org.ar"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-black text-sm bg-brand-chartreuse text-brand-black hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Guardando..." : "Guardar Entidad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
