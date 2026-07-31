"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Search,
  UserCheck,
  Edit2,
  Eye,
  Power,
  Mail,
  MapPin,
  X,
  LayoutGrid,
  List,
  AlertTriangle,
} from "lucide-react";
import { FiscalesService, Fiscal } from "@/utils/services/fiscales";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";

export default function ColegioFiscalesPage() {
  const [fiscales, setFiscales] = useState<Fiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFiscal, setSelectedFiscal] = useState<Fiscal | null>(null);

  // FeedbackModal para confirmación de cambio de estado
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "warning",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    direccion: "",
    correo: "",
    rango: "Provincial" as "Local" | "Regional" | "Provincial" | "Nacional",
    asociacion: "FAP",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFiscales();
  }, []);

  const fetchFiscales = async () => {
    try {
      setLoading(true);
      const data = await FiscalesService.getAll();
      setFiscales(data);
    } catch (err) {
      console.error("Error al cargar colegio de fiscales:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setForm({
      nombre: "",
      apellido: "",
      dni: "",
      direccion: "",
      correo: "",
      rango: "Provincial",
      asociacion: "FAP",
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (f: Fiscal) => {
    setSelectedFiscal(f);
    setForm({
      nombre: f.nombre || "",
      apellido: f.apellido || "",
      dni: f.dni || "",
      direccion: f.direccion || "",
      correo: f.correo || "",
      rango: f.rango || "Provincial",
      asociacion: f.asociacion || "FAP",
    });
    setShowEditModal(true);
  };

  const handleOpenDetail = (f: Fiscal) => {
    setSelectedFiscal(f);
    setShowDetailModal(true);
  };

  const requestToggleEstado = (f: Fiscal) => {
    const nuevoEstado = !(f.activo ?? true);
    setFeedbackModal({
      isOpen: true,
      title: nuevoEstado ? "¿Habilitar Fiscal?" : "¿Inhabilitar Fiscal?",
      description: nuevoEstado
        ? `¿Confirmás que querés habilitar al fiscal ${f.nombre} ${f.apellido} para actuar en torneos oficiales?`
        : `¿Confirmás que querés inhabilitar al fiscal ${f.nombre} ${f.apellido}? No podrá ser asignado a nuevos torneos mientras esté inhabilitado.`,
      type: nuevoEstado ? "info" : "warning",
      confirmText: nuevoEstado ? "Sí, Habilitar" : "Sí, Inhabilitar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        try {
          await FiscalesService.cambiarEstado(f.id, nuevoEstado);
          sileo.success({
            title: nuevoEstado ? "Fiscal Habilitado" : "Fiscal Inhabilitado",
            description: `El fiscal ${f.nombre} ${f.apellido} ha sido ${nuevoEstado ? "habilitado" : "inhabilitado"}.`,
          });
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
          fetchFiscales();
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
    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim()) {
      sileo.error({
        title: "Campos incompletos",
        description: "Completá Nombre, Apellido y DNI del fiscal.",
      });
      return;
    }

    if (!/^\d+$/.test(form.dni.trim())) {
      sileo.error({
        title: "DNI Inválido",
        description:
          "El campo DNI debe contener únicamente números sin puntos ni letras.",
      });
      return;
    }

    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      sileo.error({
        title: "Correo Inválido",
        description: "Ingresá una dirección de correo electrónico válida.",
      });
      return;
    }

    try {
      setSaving(true);
      await FiscalesService.create(form);
      sileo.success({
        title: "Fiscal Registrado",
        description: `${form.nombre} ${form.apellido} ha sido añadido al Colegio de Fiscales.`,
      });
      setShowCreateModal(false);
      fetchFiscales();
    } catch (err: any) {
      sileo.error({
        title: "Error al registrar",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiscal) return;
    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim()) {
      sileo.error({
        title: "Campos incompletos",
        description: "Completá Nombre, Apellido y DNI.",
      });
      return;
    }

    try {
      setSaving(true);
      await FiscalesService.update(selectedFiscal.id, form);
      sileo.success({
        title: "Fiscal Actualizado",
        description: "Los datos del fiscal han sido modificados con éxito.",
      });
      setShowEditModal(false);
      fetchFiscales();
    } catch (err: any) {
      sileo.error({
        title: "Error al actualizar",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredFiscales = fiscales.filter(
    (f) =>
      f.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      f.apellido?.toLowerCase().includes(search.toLowerCase()) ||
      f.dni?.includes(search),
  );

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
            <Shield className="size-4" /> Entidad Reguladora FAP
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Colegio de Fiscales y Árbitros
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestión centralizada del cuerpo arbitral, rangos de alcance,
            inhabilitaciones y edición.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-sm cursor-pointer"
        >
          <Plus className="size-4" /> Registrar Nuevo Fiscal
        </button>
      </div>

      {/* Barra de Filtros y Conmutador de Vista */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-3.5 size-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por Nombre, Apellido o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-white/10 text-white pl-11 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-chartreuse/50"
          />
        </div>

        {/* Conmutador Tabla / Cards */}
        <div className="flex items-center bg-[#161616] p-1 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "cards"
                ? "bg-brand-chartreuse text-brand-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="size-4" /> Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-brand-chartreuse text-brand-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <List className="size-4" /> Tabla
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold">
          Cargando cuerpo arbitral...
        </div>
      ) : filteredFiscales.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl text-gray-500">
          No se encontraron fiscales registrados.
        </div>
      ) : viewMode === "cards" ? (
        /* VISTA EN CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFiscales.map((f) => {
            const isActivo = f.activo ?? true;
            return (
              <div
                key={f.id}
                className={`bg-[#161616] border border-white/5 p-6 rounded-3xl space-y-5 transition-all hover:border-white/20 shadow-xl relative overflow-hidden ${
                  !isActivo ? "opacity-60 bg-black/40 border-rose-500/20" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center text-brand-chartreuse">
                      <UserCheck className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base">
                        {f.nombre} {f.apellido}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono">
                        DNI: {f.dni}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isActivo
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {isActivo ? "Habilitado" : "Inhabilitado"}
                  </span>
                </div>

                <div className="space-y-2 text-xs border-t border-b border-white/5 py-4">
                  <div className="flex justify-between text-gray-400">
                    <span>Alcance Arbitral:</span>
                    <span className="text-brand-chartreuse font-bold">
                      {f.rango || "Provincial"}
                    </span>
                  </div>
                  {f.correo && (
                    <div className="flex justify-between text-gray-400 truncate">
                      <span>Correo:</span>
                      <span className="text-white font-medium truncate max-w-45">
                        {f.correo}
                      </span>
                    </div>
                  )}
                  {f.direccion && (
                    <div className="flex justify-between text-gray-400 truncate">
                      <span>Residencia:</span>
                      <span className="text-white font-medium truncate max-w-45">
                        {f.direccion}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => requestToggleEstado(f)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isActivo
                        ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    <Power className="size-3.5" />
                    {isActivo ? "Inhabilitar" : "Habilitar"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenDetail(f)}
                      className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors cursor-pointer"
                      title="Ver Expediente"
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse rounded-xl transition-colors cursor-pointer"
                      title="Editar Fiscal"
                    >
                      <Edit2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
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
                  <th className="px-6 py-4">Fiscal / Árbitro</th>
                  <th className="px-6 py-4">DNI</th>
                  <th className="px-6 py-4">Rango / Alcance</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-semibold text-gray-300">
                {filteredFiscales.map((f) => {
                  const isActivo = f.activo ?? true;
                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-white/5 transition-colors ${
                        !isActivo ? "opacity-50 bg-black/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <UserCheck className="size-4 text-brand-chartreuse shrink-0" />
                          <span>
                            {f.nombre} {f.apellido}
                          </span>
                        </div>
                        {f.correo && (
                          <span className="text-[11px] text-gray-500 block mt-0.5">
                            {f.correo}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-400">
                        {f.dni}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-brand-chartreuse font-bold">
                          {f.rango || "Provincial"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => requestToggleEstado(f)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 mx-auto ${
                            isActivo
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                          }`}
                        >
                          <Power className="size-3" />
                          {isActivo ? "Habilitado" : "Inhabilitado"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() => handleOpenDetail(f)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors cursor-pointer"
                            title="Ver Expediente Completo"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(f)}
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

      {/* Modal Crear Fiscal */}
      {showCreateModal && (
        <FormFiscalModal
          title="Alta de Fiscal u Árbitro Oficial"
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Modal Editar Fiscal */}
      {showEditModal && (
        <FormFiscalModal
          title="Modificar Ficha de Fiscal"
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Modal Detalle Fiscal */}
      {showDetailModal && selectedFiscal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl relative space-y-6">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black text-brand-chartreuse uppercase tracking-wider block mb-1">
                  Legajo Oficial Arbitral
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  {selectedFiscal.nombre} {selectedFiscal.apellido}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 font-bold">DNI:</span>
                <span className="text-white font-mono font-bold">
                  {selectedFiscal.dni}
                </span>
              </div>
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 font-bold">Rango Arbitral:</span>
                <span className="text-brand-chartreuse font-bold">
                  {selectedFiscal.rango || "Provincial"}
                </span>
              </div>
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <Mail className="size-3.5 text-brand-chartreuse" /> Correo
                  Electrónico:
                </span>
                <span className="text-white font-semibold block">
                  {selectedFiscal.correo || "No registrado"}
                </span>
              </div>
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-brand-chartreuse" />{" "}
                  Dirección / Residencia:
                </span>
                <span className="text-white font-semibold block">
                  {selectedFiscal.direccion || "No registrada"}
                </span>
              </div>
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 font-bold">
                  Estatus Habilitación:
                </span>
                <span
                  className={`font-bold ${
                    (selectedFiscal.activo ?? true)
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {(selectedFiscal.activo ?? true)
                    ? "Habilitado Oficial"
                    : "Inhabilitado"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar Expediente
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación FeedbackModal */}
      <FeedbackModal {...feedbackModal} />
    </div>
  );
}

// Componente Reutilizable de Formulario
interface FormFiscalModalProps {
  title: string;
  form: any;
  setForm: (f: any) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function FormFiscalModal({
  title,
  form,
  setForm,
  saving,
  onSubmit,
  onClose,
}: FormFiscalModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl relative">
        <h3 className="text-xl font-extrabold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-xs mb-6">
          Completá los datos del fiscal u árbitro oficial homologado.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Nombre
            </label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder="Ej: Marcelo"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Apellido
            </label>
            <input
              type="text"
              required
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder="Ej: Rossi"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              DNI (Solo números)
            </label>
            <input
              type="text"
              required
              value={form.dni}
              onChange={(e) =>
                setForm({ ...form, dni: e.target.value.replace(/\D/g, "") })
              }
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder="Ej: 30123456"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder="ejemplo@federacion.org"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Dirección / Residencia
            </label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder="Av. Córdoba 1234"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Alcance / Rango Arbitral
            </label>
            <CustomDropdown
              value={form.rango}
              onChange={(val) => setForm({ ...form, rango: val as any })}
              options={[
                { value: "Local", label: "Local" },
                { value: "Regional", label: "Regional" },
                { value: "Provincial", label: "Provincial" },
                { value: "Nacional", label: "Nacional" },
              ]}
              placeholder="Seleccionar Rango..."
              haciaArriba
            />
          </div>

          <div className="flex gap-3 pt-4">
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
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
