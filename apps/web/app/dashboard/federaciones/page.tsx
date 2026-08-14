"use client";

import { FormEvent, MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit2,
  Globe2,
  Landmark,
  MapPin,
  Plus,
  Power,
  Scale,
  Search,
  X,
} from "lucide-react";
import {
  FederacionesService,
  type Federacion,
  type FederacionPayload,
} from "@/utils/services/federaciones";
import FeedbackModal, {
  type FeedbackModalProps,
} from "@/components/ui/FeedbackModal";

const FORM_INICIAL: FederacionPayload = {
  nombre: "",
  sigla: "",
  pais: "Argentina",
  descripcion: "",
};

export default function PadronFederacionesPage() {
  const [federaciones, setFederaciones] = useState<Federacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Federacion | null>(null);
  const [form, setForm] = useState<FederacionPayload>(FORM_INICIAL);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedback((prev) => ({ ...prev, isOpen: false })),
  });

  const cargar = async () => {
    setLoading(true);
    const data = await FederacionesService.getAll();
    setFederaciones(data);
    setLoading(false);
  };

  useEffect(() => {
    void cargar();
  }, []);

  const filtradas = federaciones.filter((f) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      f.nombre.toLowerCase().includes(q) ||
      (f.sigla || "").toLowerCase().includes(q) ||
      (f.pais || "").toLowerCase().includes(q)
    );
  });

  const abrirCrear = () => {
    setEditing(null);
    setForm(FORM_INICIAL);
    setShowModal(true);
  };

  const abrirEditar = (e: MouseEvent, f: Federacion) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(f);
    setForm({
      nombre: f.nombre,
      sigla: f.sigla || "",
      pais: f.pais || "Argentina",
      descripcion: f.descripcion || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await FederacionesService.update(editing.id, form);
      } else {
        await FederacionesService.create(form);
      }
      setShowModal(false);
      await cargar();
      setFeedback({
        isOpen: true,
        type: "success",
        title: editing ? "Federación actualizada" : "Federación registrada",
        description: `${form.nombre} ya figura en el padrón del CRM.`,
        onClose: () => setFeedback((prev) => ({ ...prev, isOpen: false })),
      });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setFeedback({
        isOpen: true,
        type: "error",
        title: "No se pudo guardar",
        description:
          apiError.response?.data?.message || "Revisá los datos e intentá de nuevo.",
        onClose: () => setFeedback((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setSaving(false);
    }
  };

  const requestToggleEstado = (e: MouseEvent, f: Federacion) => {
    e.preventDefault();
    e.stopPropagation();
    const esActivo = (f.estado || "activo") === "activo";
    setFeedback({
      isOpen: true,
      type: "warning",
      title: esActivo ? "Inhabilitar federación" : "Habilitar federación",
      description: esActivo
        ? `${f.nombre} dejará de figurar como activa en la red.`
        : `${f.nombre} volverá a estar activa en la red.`,
      confirmText: esActivo ? "Inhabilitar" : "Habilitar",
      onConfirm: async () => {
        await FederacionesService.cambiarEstado(
          f.id,
          esActivo ? "inactivo" : "activo",
        );
        await cargar();
        setFeedback((prev) => ({ ...prev, isOpen: false }));
      },
      onClose: () => setFeedback((prev) => ({ ...prev, isOpen: false })),
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
            <Scale className="size-4" /> CRM · Red institucional
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Federaciones
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Entidades nacionales de la red Padel Nexus. Cada federación agrupa
            sus asociaciones provinciales.
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center justify-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer"
        >
          <Plus className="size-4" /> Registrar Federación
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar federación, sigla o país..."
          className="w-full bg-[#161616] border border-white/10 text-white pl-11 pr-4 py-3 rounded-2xl text-sm outline-none focus:border-brand-chartreuse/40"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando padrón de federaciones...</p>
      ) : filtradas.length === 0 ? (
        <div className="border border-white/5 rounded-3xl bg-[#151515] p-12 text-center text-gray-500">
          <Globe2 className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay federaciones para mostrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtradas.map((f) => {
            const esActivo = (f.estado || "activo") === "activo";
            return (
              <Link
                key={f.id}
                href={`/dashboard/federaciones/${f.id}`}
                className={`bg-brand-card border rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between group ${
                  esActivo
                    ? "border-white/5 hover:border-brand-chartreuse/40"
                    : "border-rose-500/20 bg-black/40 opacity-70"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-12 min-w-14 px-3 rounded-2xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center text-brand-chartreuse font-black text-xs">
                      {f.sigla || f.nombre.slice(0, 3).toUpperCase()}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        esActivo
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {esActivo ? "Activa" : "Inhabilitada"}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white group-hover:text-brand-chartreuse transition-colors mb-1">
                    {f.nombre}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-6">
                    <MapPin className="size-3.5 text-brand-chartreuse shrink-0" />
                    {f.pais || "Sin país"}
                  </p>
                  <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase block font-bold">
                      Asociaciones
                    </span>
                    <span className="text-base font-extrabold text-white flex items-center gap-1 mt-0.5">
                      <Landmark className="size-4 text-brand-chartreuse" />
                      {f.asociaciones_count || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-5 mt-4 border-t border-white/5">
                  <button
                    onClick={(e) => requestToggleEstado(e, f)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      esActivo
                        ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    <Power className="size-3" />
                    {esActivo ? "Inhabilitar" : "Habilitar"}
                  </button>
                  <button
                    onClick={(e) => abrirEditar(e, f)}
                    className="p-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse rounded-xl cursor-pointer"
                    title="Editar federación"
                  >
                    <Edit2 className="size-4" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-xl font-extrabold text-white">
                {editing ? "Editar federación" : "Registrar federación"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Nombre oficial *
                </label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold outline-none focus:border-brand-chartreuse/50 text-sm"
                  placeholder="Ej: Federación Argentina de Pádel"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                    Sigla
                  </label>
                  <input
                    value={form.sigla}
                    onChange={(e) => setForm({ ...form, sigla: e.target.value })}
                    className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold outline-none focus:border-brand-chartreuse/50 text-sm"
                    placeholder="FAP"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                    País
                  </label>
                  <input
                    value={form.pais}
                    onChange={(e) => setForm({ ...form, pais: e.target.value })}
                    className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold outline-none focus:border-brand-chartreuse/50 text-sm"
                    placeholder="Argentina"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  rows={3}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl outline-none focus:border-brand-chartreuse/50 text-sm resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-brand-chartreuse text-brand-black font-black py-3 rounded-xl disabled:opacity-60"
              >
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Registrar"}
              </button>
            </form>
          </div>
        </div>
      )}

      <FeedbackModal {...feedback} />
    </div>
  );
}
