"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Handshake,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import { TorneosService } from "@/utils/services/torneos";
import {
  MarketplaceService,
  type EntidadRef,
  type EstadoSponsorCampana,
  type EspacioSponsorCampana,
  type MarketplaceSponsor,
  type MarketplaceSponsorCampana,
} from "@/utils/services/marketplace";

interface Props {
  entidadRef: EntidadRef;
}

const ESPACIOS: { value: EspacioSponsorCampana; label: string }[] = [
  { value: "banner", label: "Banner" },
  { value: "home", label: "Home marketplace" },
  { value: "tienda", label: "Perfil de tienda" },
  { value: "checkout", label: "Checkout" },
];

const ESTADOS: { value: EstadoSponsorCampana; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "activa", label: "Activa" },
  { value: "pausada", label: "Pausada" },
  { value: "finalizada", label: "Finalizada" },
];

const emptySponsorForm = {
  nombre: "",
  contacto_email: "",
  contacto_telefono: "",
  notas: "",
  activo: true,
};

const emptyCampanaForm = {
  sponsor_id: "",
  titulo: "",
  descripcion: "",
  espacio: "banner" as EspacioSponsorCampana,
  fecha_inicio: "",
  fecha_fin: "",
  provincia: "",
  torneo_id: "",
  categoria: "",
  link_url: "",
  estado: "borrador" as EstadoSponsorCampana,
};

export default function MarketplaceSponsorsTab({ entidadRef }: Props) {
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState<MarketplaceSponsor[]>([]);
  const [campanas, setCampanas] = useState<MarketplaceSponsorCampana[]>([]);
  const [torneos, setTorneos] = useState<{ id: string; nombre: string }[]>([]);
  const [expandedSponsorId, setExpandedSponsorId] = useState<string | null>(null);

  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [editSponsorId, setEditSponsorId] = useState<string | null>(null);
  const [sponsorForm, setSponsorForm] = useState(emptySponsorForm);
  const [savingSponsor, setSavingSponsor] = useState(false);

  const [showCampanaForm, setShowCampanaForm] = useState(false);
  const [editCampanaId, setEditCampanaId] = useState<string | null>(null);
  const [campanaForm, setCampanaForm] = useState(emptyCampanaForm);
  const [savingCampana, setSavingCampana] = useState(false);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void | Promise<void>;
  }>({ isOpen: false, title: "", description: "" });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [sp, ca, tors] = await Promise.all([
        MarketplaceService.crmListarSponsors(entidadRef),
        MarketplaceService.crmListarSponsorCampanas(entidadRef),
        TorneosService.getAll({ limit: 100 }).catch(() => []),
      ]);
      setSponsors(sp);
      setCampanas(ca);
      setTorneos(
        (Array.isArray(tors) ? tors : []).map((t: { id: string; nombre: string }) => ({
          id: t.id,
          nombre: t.nombre,
        })),
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      sileo.error({
        title: "Error",
        description: message || "No se pudieron cargar sponsors.",
      });
    } finally {
      setLoading(false);
    }
  }, [entidadRef]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const campanasPorSponsor = useMemo(() => {
    const map = new Map<string, MarketplaceSponsorCampana[]>();
    for (const c of campanas) {
      const list = map.get(c.sponsor_id) || [];
      list.push(c);
      map.set(c.sponsor_id, list);
    }
    return map;
  }, [campanas]);

  const openNewSponsor = () => {
    setEditSponsorId(null);
    setSponsorForm(emptySponsorForm);
    setShowSponsorForm(true);
  };

  const openEditSponsor = (s: MarketplaceSponsor) => {
    setEditSponsorId(s.id);
    setSponsorForm({
      nombre: s.nombre,
      contacto_email: s.contacto_email || "",
      contacto_telefono: s.contacto_telefono || "",
      notas: s.notas || "",
      activo: s.activo,
    });
    setShowSponsorForm(true);
  };

  const handleSaveSponsor = async () => {
    if (!sponsorForm.nombre.trim()) {
      sileo.error({ title: "Falta el nombre", description: "Ingresá el nombre del sponsor." });
      return;
    }
    setSavingSponsor(true);
    try {
      if (editSponsorId) {
        await MarketplaceService.crmActualizarSponsor(entidadRef, editSponsorId, {
          nombre: sponsorForm.nombre.trim(),
          contacto_email: sponsorForm.contacto_email.trim() || null,
          contacto_telefono: sponsorForm.contacto_telefono.trim() || null,
          notas: sponsorForm.notas.trim() || null,
          activo: sponsorForm.activo,
        });
      } else {
        await MarketplaceService.crmCrearSponsor(entidadRef, {
          nombre: sponsorForm.nombre.trim(),
          contacto_email: sponsorForm.contacto_email.trim() || null,
          contacto_telefono: sponsorForm.contacto_telefono.trim() || null,
          notas: sponsorForm.notas.trim() || null,
          activo: sponsorForm.activo,
        });
      }
      setShowSponsorForm(false);
      sileo.success({ title: "Sponsor guardado" });
      await cargar();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      sileo.error({ title: "Error", description: message || "No se pudo guardar." });
    } finally {
      setSavingSponsor(false);
    }
  };

  const confirmDeleteSponsor = (s: MarketplaceSponsor) => {
    setFeedback({
      isOpen: true,
      title: "Eliminar sponsor",
      description: `¿Eliminar a ${s.nombre} y todas sus campañas?`,
      onConfirm: async () => {
        try {
          await MarketplaceService.crmEliminarSponsor(entidadRef, s.id);
          sileo.success({ title: "Sponsor eliminado" });
          setFeedback((p) => ({ ...p, isOpen: false }));
          await cargar();
        } catch (err: unknown) {
          const message =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : undefined;
          sileo.error({ title: "Error", description: message || "No se pudo eliminar." });
        }
      },
    });
  };

  const openNewCampana = (sponsorId?: string) => {
    setEditCampanaId(null);
    setCampanaForm({
      ...emptyCampanaForm,
      sponsor_id: sponsorId || sponsors[0]?.id || "",
    });
    setShowCampanaForm(true);
  };

  const openEditCampana = (c: MarketplaceSponsorCampana) => {
    setEditCampanaId(c.id);
    setCampanaForm({
      sponsor_id: c.sponsor_id,
      titulo: c.titulo,
      descripcion: c.descripcion || "",
      espacio: c.espacio,
      fecha_inicio: c.fecha_inicio?.slice(0, 10) || "",
      fecha_fin: c.fecha_fin?.slice(0, 10) || "",
      provincia: c.provincia || "",
      torneo_id: c.torneo_id || "",
      categoria: c.categoria || "",
      link_url: c.link_url || "",
      estado: c.estado,
    });
    setShowCampanaForm(true);
  };

  const handleSaveCampana = async () => {
    if (!campanaForm.sponsor_id || !campanaForm.titulo.trim()) {
      sileo.error({
        title: "Datos incompletos",
        description: "Sponsor y título son obligatorios.",
      });
      return;
    }
    if (!campanaForm.fecha_inicio || !campanaForm.fecha_fin) {
      sileo.error({
        title: "Fechas requeridas",
        description: "Indicá inicio y fin de la campaña.",
      });
      return;
    }
    setSavingCampana(true);
    try {
      const payload = {
        sponsor_id: campanaForm.sponsor_id,
        titulo: campanaForm.titulo.trim(),
        descripcion: campanaForm.descripcion.trim() || null,
        espacio: campanaForm.espacio,
        fecha_inicio: campanaForm.fecha_inicio,
        fecha_fin: campanaForm.fecha_fin,
        provincia: campanaForm.provincia || null,
        torneo_id: campanaForm.torneo_id || null,
        categoria: campanaForm.categoria.trim() || null,
        link_url: campanaForm.link_url.trim() || null,
        estado: campanaForm.estado,
      };
      if (editCampanaId) {
        await MarketplaceService.crmActualizarSponsorCampana(
          entidadRef,
          editCampanaId,
          payload,
        );
      } else {
        await MarketplaceService.crmCrearSponsorCampana(entidadRef, payload);
      }
      setShowCampanaForm(false);
      sileo.success({ title: "Campaña guardada" });
      await cargar();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      sileo.error({ title: "Error", description: message || "No se pudo guardar la campaña." });
    } finally {
      setSavingCampana(false);
    }
  };

  const confirmDeleteCampana = (c: MarketplaceSponsorCampana) => {
    setFeedback({
      isOpen: true,
      title: "Eliminar campaña",
      description: `¿Eliminar la campaña "${c.titulo}"?`,
      onConfirm: async () => {
        try {
          await MarketplaceService.crmEliminarSponsorCampana(entidadRef, c.id);
          sileo.success({ title: "Campaña eliminada" });
          setFeedback((p) => ({ ...p, isOpen: false }));
          await cargar();
        } catch (err: unknown) {
          const message =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : undefined;
          sileo.error({ title: "Error", description: message || "No se pudo eliminar." });
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 border-4 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center">
            <Handshake className="size-5 text-brand-chartreuse" />
          </div>
          <div>
            <h2 className="text-lg font-black">Sponsors y campañas</h2>
            <p className="text-xs text-gray-500">
              Espacios publicitarios por período, región o torneo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openNewSponsor}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-chartreuse text-brand-black text-xs font-bold cursor-pointer"
          >
            <Plus className="size-4" />
            Nuevo sponsor
          </button>
          <button
            type="button"
            onClick={() => openNewCampana()}
            disabled={sponsors.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-white/10 text-xs font-bold text-gray-300 hover:text-white cursor-pointer disabled:opacity-40"
          >
            <Megaphone className="size-4" />
            Nueva campaña
          </button>
        </div>
      </div>

      {sponsors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-white/10 p-10 text-center text-sm text-gray-500">
          Todavía no hay sponsors. Creá el primero para cargar campañas.
        </div>
      ) : (
        <div className="space-y-3">
          {sponsors.map((s) => {
            const list = campanasPorSponsor.get(s.id) || [];
            const expanded = expandedSponsorId === s.id;
            return (
              <div
                key={s.id}
                className="bg-brand-card border border-brand-white/5 rounded-2xl overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSponsorId(expanded ? null : s.id)
                    }
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="size-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center shrink-0 text-gray-500">
                      <Handshake className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{s.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {list.length} campaña{list.length === 1 ? "" : "s"}
                        {!s.activo ? " · inactivo" : ""}
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp className="size-4 text-gray-500 shrink-0 ml-auto" />
                    ) : (
                      <ChevronDown className="size-4 text-gray-500 shrink-0 ml-auto" />
                    )}
                  </button>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => openNewCampana(s.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-gray-400 hover:text-white cursor-pointer"
                    >
                      + Campaña
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditSponsor(s)}
                      className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDeleteSponsor(s)}
                      className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-white/5 p-4 space-y-2 bg-black/20">
                    {list.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">Sin campañas.</p>
                    ) : (
                      list.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-white/5 bg-brand-card/60 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">
                              {c.titulo}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {c.fecha_inicio?.slice(0, 10)} → {c.fecha_fin?.slice(0, 10)} ·{" "}
                              {c.espacio}
                              {c.provincia ? ` · ${c.provincia}` : ""}
                              {c.categoria ? ` · ${c.categoria}` : ""}
                              {" · "}
                              <span className="capitalize">{c.estado}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditCampana(c)}
                              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDeleteCampana(c)}
                              className="p-2 rounded-lg border border-red-500/20 text-red-400 cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showSponsorForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-brand-card border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-black">
              {editSponsorId ? "Editar sponsor" : "Nuevo sponsor"}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre"
                value={sponsorForm.nombre}
                onChange={(e) =>
                  setSponsorForm((p) => ({ ...p, nombre: e.target.value }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email de contacto"
                value={sponsorForm.contacto_email}
                onChange={(e) =>
                  setSponsorForm((p) => ({ ...p, contacto_email: e.target.value }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={sponsorForm.contacto_telefono}
                onChange={(e) =>
                  setSponsorForm((p) => ({
                    ...p,
                    contacto_telefono: e.target.value,
                  }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
              <textarea
                placeholder="Notas"
                rows={3}
                value={sponsorForm.notas}
                onChange={(e) =>
                  setSponsorForm((p) => ({ ...p, notas: e.target.value }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:border-brand-chartreuse focus:outline-none"
              />
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sponsorForm.activo}
                  onChange={(e) =>
                    setSponsorForm((p) => ({ ...p, activo: e.target.checked }))
                  }
                />
                Activo
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSponsorForm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingSponsor}
                onClick={() => void handleSaveSponsor()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-chartreuse text-brand-black cursor-pointer disabled:opacity-50"
              >
                {savingSponsor ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCampanaForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-brand-card border border-white/10 rounded-3xl p-6 space-y-4 my-8">
            <h3 className="text-lg font-black">
              {editCampanaId ? "Editar campaña" : "Nueva campaña"}
            </h3>
            <div className="space-y-3">
              <CustomDropdown
                value={campanaForm.sponsor_id}
                onChange={(v) =>
                  setCampanaForm((p) => ({ ...p, sponsor_id: v }))
                }
                placeholder="Sponsor"
                options={sponsors.map((s) => ({ value: s.id, label: s.nombre }))}
              />
              <input
                type="text"
                placeholder="Título"
                value={campanaForm.titulo}
                onChange={(e) =>
                  setCampanaForm((p) => ({ ...p, titulo: e.target.value }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
              <textarea
                placeholder="Descripción"
                rows={2}
                value={campanaForm.descripcion}
                onChange={(e) =>
                  setCampanaForm((p) => ({ ...p, descripcion: e.target.value }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:border-brand-chartreuse focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <CustomDropdown
                  value={campanaForm.espacio}
                  onChange={(v) =>
                    setCampanaForm((p) => ({
                      ...p,
                      espacio: v as EspacioSponsorCampana,
                    }))
                  }
                  placeholder="Espacio"
                  options={ESPACIOS}
                />
                <CustomDropdown
                  value={campanaForm.estado}
                  onChange={(v) =>
                    setCampanaForm((p) => ({
                      ...p,
                      estado: v as EstadoSponsorCampana,
                    }))
                  }
                  placeholder="Estado"
                  options={ESTADOS}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Inicio
                  </label>
                  <input
                    type="date"
                    value={campanaForm.fecha_inicio}
                    onChange={(e) =>
                      setCampanaForm((p) => ({
                        ...p,
                        fecha_inicio: e.target.value,
                      }))
                    }
                    className="w-full bg-brand-input border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-brand-chartreuse focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Fin
                  </label>
                  <input
                    type="date"
                    value={campanaForm.fecha_fin}
                    onChange={(e) =>
                      setCampanaForm((p) => ({
                        ...p,
                        fecha_fin: e.target.value,
                      }))
                    }
                    className="w-full bg-brand-input border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-brand-chartreuse focus:outline-none"
                  />
                </div>
              </div>
              <CustomDropdown
                value={campanaForm.provincia}
                onChange={(v) =>
                  setCampanaForm((p) => ({ ...p, provincia: v }))
                }
                placeholder="Provincia (opcional)"
                options={[
                  { value: "", label: "Todas las provincias" },
                  ...PROVINCIAS_ARG,
                ]}
              />
              <CustomDropdown
                value={campanaForm.torneo_id}
                onChange={(v) =>
                  setCampanaForm((p) => ({ ...p, torneo_id: v }))
                }
                placeholder="Torneo (opcional)"
                options={[
                  { value: "", label: "Sin torneo específico" },
                  ...torneos.map((t) => ({ value: t.id, label: t.nombre })),
                ]}
              />
              <input
                type="text"
                placeholder="Categoría (opcional)"
                value={campanaForm.categoria}
                onChange={(e) =>
                  setCampanaForm((p) => ({ ...p, categoria: e.target.value }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
              <input
                type="url"
                placeholder="Link URL (opcional)"
                value={campanaForm.link_url}
                onChange={(e) =>
                  setCampanaForm((p) => ({ ...p, link_url: e.target.value }))
                }
                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCampanaForm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingCampana}
                onClick={() => void handleSaveCampana()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-chartreuse text-brand-black cursor-pointer disabled:opacity-50"
              >
                {savingCampana ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={feedback.isOpen}
        onClose={() => setFeedback((p) => ({ ...p, isOpen: false }))}
        title={feedback.title}
        description={feedback.description}
        type="warning"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={
          feedback.onConfirm
            ? () => {
                void feedback.onConfirm?.();
              }
            : undefined
        }
      />
    </div>
  );
}
