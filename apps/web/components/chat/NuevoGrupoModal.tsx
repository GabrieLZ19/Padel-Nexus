"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { isAxiosError } from "axios";
import { Check, Search, User, Users, X } from "lucide-react";
import { sileo } from "sileo";
import { ChatService } from "@/utils/services/chat";
import type { ChatContactoBusqueda } from "@/utils/types";

interface NuevoGrupoModalProps {
  isOpen: boolean;
  onClose: () => void;
  excludeUserId?: string | null;
  onCreated: (conversacionId: string) => void;
}

function displayName(c: ChatContactoBusqueda) {
  const parts = [c.nombre, c.apellido].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return c.email || "Usuario";
}

export default function NuevoGrupoModal({
  isOpen,
  onClose,
  excludeUserId,
  onCreated,
}: NuevoGrupoModalProps) {
  const [nombre, setNombre] = useState("");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ChatContactoBusqueda[]>([]);
  const [seleccionados, setSeleccionados] = useState<ChatContactoBusqueda[]>(
    [],
  );
  const [buscando, setBuscando] = useState(false);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNombre("");
    setQuery("");
    setResultados([]);
    setSeleccionados([]);
    setBuscando(false);
    setCreando(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creando) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, creando, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await ChatService.buscarContactos(q);
          const filtered = data.filter((c) => c.id !== excludeUserId);
          setResultados(filtered);
        } catch (err) {
          setResultados([]);
          const message = isAxiosError(err)
            ? err.response?.data?.error || "No se pudieron buscar contactos."
            : "No se pudieron buscar contactos.";
          sileo.error({ title: "Búsqueda", description: message });
        } finally {
          setBuscando(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(handle);
  }, [query, isOpen, excludeUserId]);

  const toggleMiembro = (contacto: ChatContactoBusqueda) => {
    setSeleccionados((prev) => {
      if (prev.some((p) => p.id === contacto.id)) {
        return prev.filter((p) => p.id !== contacto.id);
      }
      return [...prev, contacto];
    });
  };

  const handleCreate = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      sileo.warning({
        title: "Nombre requerido",
        description: "Indicá un nombre para el grupo.",
      });
      return;
    }
    if (seleccionados.length < 1) {
      sileo.warning({
        title: "Integrantes",
        description: "Agregá al menos un integrante.",
      });
      return;
    }

    setCreando(true);
    try {
      const result = await ChatService.crearGrupo(
        nombreTrim,
        seleccionados.map((s) => s.id),
      );
      sileo.success({
        title: "Grupo creado",
        description: result.nombre || nombreTrim,
      });
      onCreated(result.id);
      onClose();
    } catch (err) {
      const message = isAxiosError(err)
        ? err.response?.data?.error || "No se pudo crear el grupo."
        : "No se pudo crear el grupo.";
      sileo.error({ title: "Error", description: message });
    } finally {
      setCreando(false);
    }
  };

  if (!isOpen) return null;

  const selectedIds = new Set(seleccionados.map((s) => s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuevo-grupo-title"
        className="w-full max-w-md max-h-[min(90dvh,640px)] flex flex-col rounded-2xl border border-brand-white/10 bg-brand-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-brand-white/5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shrink-0">
              <Users className="size-4 text-brand-chartreuse" />
            </div>
            <h2
              id="nuevo-grupo-title"
              className="text-sm font-bold text-brand-white truncate"
            >
              Nuevo grupo
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creando}
            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-white hover:bg-brand-white/5 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Nombre del grupo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Equipo viernes"
              maxLength={80}
              className="w-full px-3.5 py-2.5 bg-brand-black border border-brand-white/10 rounded-xl text-sm text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
            />
          </div>

          {seleccionados.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {seleccionados.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleMiembro(s)}
                  className="inline-flex items-center gap-1.5 max-w-full pl-1 pr-2 py-1 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/25 text-[11px] font-semibold text-brand-chartreuse cursor-pointer hover:bg-brand-chartreuse/20 transition-colors"
                >
                  <span className="relative size-5 rounded-full overflow-hidden bg-brand-black/40 shrink-0 flex items-center justify-center">
                    {s.avatar_url ? (
                      <Image
                        src={s.avatar_url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="size-3 text-gray-500" />
                    )}
                  </span>
                  <span className="truncate">{displayName(s)}</span>
                  <X className="size-3 shrink-0 opacity-70" />
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Buscar contactos
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, apellido, email o DNI..."
                className="w-full pl-10 pr-4 py-2.5 bg-brand-black border border-brand-white/10 rounded-xl text-sm text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">
              Escribí al menos 2 caracteres
            </p>
          </div>

          <div className="rounded-xl border border-brand-white/5 bg-brand-black/40 min-h-[140px] max-h-52 overflow-y-auto">
            {buscando ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin size-5 border-2 border-brand-chartreuse border-t-transparent rounded-full" />
              </div>
            ) : query.trim().length < 2 ? (
              <p className="text-xs text-gray-500 text-center py-8 px-4">
                Buscá jugadores para agregar al grupo
              </p>
            ) : resultados.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8 px-4">
                Sin resultados
              </p>
            ) : (
              <ul className="divide-y divide-brand-white/5">
                {resultados.map((c) => {
                  const selected = selectedIds.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggleMiembro(c)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          selected
                            ? "bg-brand-chartreuse/8"
                            : "hover:bg-brand-white/3"
                        }`}
                      >
                        <span className="relative size-9 rounded-full overflow-hidden bg-brand-card border border-brand-white/10 shrink-0 flex items-center justify-center">
                          {c.avatar_url ? (
                            <Image
                              src={c.avatar_url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <User className="size-4 text-gray-500" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-brand-white truncate">
                            {displayName(c)}
                          </span>
                          {c.email && (
                            <span className="block text-[11px] text-gray-500 truncate">
                              {c.email}
                            </span>
                          )}
                        </span>
                        <span
                          className={`size-5 rounded-md border flex items-center justify-center shrink-0 ${
                            selected
                              ? "bg-brand-chartreuse border-brand-chartreuse text-brand-black"
                              : "border-brand-white/20 text-transparent"
                          }`}
                        >
                          <Check className="size-3" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 px-4 py-3.5 border-t border-brand-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={creando}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-brand-white bg-brand-white/5 hover:bg-brand-white/10 transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creando}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-brand-chartreuse text-brand-black hover:opacity-90 transition-all cursor-pointer disabled:opacity-40 shadow-[0_0_10px_rgba(203,254,1,0.15)]"
          >
            {creando ? "Creando..." : "Crear grupo"}
          </button>
        </div>
      </div>
    </div>
  );
}
