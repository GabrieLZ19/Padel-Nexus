"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { PAGE_SIZE_JUGADORES } from "@/utils/jugadoresListado";
import {
  CrmContactosService,
  type FiltroContactoCrm,
} from "@/utils/services/crm-contactos";
import type { Perfil } from "@/utils/types";
import type { ComunicacionesEtiqueta } from "@/utils/types/comunicaciones.types";
import { etiquetaCategoria } from "@/utils/etiquetaCategoria";
import { licenciaPreferidaListado } from "@/utils/licenciasArray";
import { ContactoEtiquetasBadges } from "./ContactoEtiquetasEditor";
import { emailContactoVisible } from "@/utils/inscripcionPlanilla";

type FiltroEtiqueta = "todas" | ComunicacionesEtiqueta;

function nombreListado(jugador: Perfil): string {
  return jugador.nombre
    ? `${jugador.apellido || ""}, ${jugador.nombre}`.replace(/^, /, "")
    : "Sin nombre";
}

function estadoLicencia(jugador: Perfil): string {
  const lic = licenciaPreferidaListado(jugador.licencias);
  if (!lic) return "Sin licencia";
  return lic.estado || "—";
}

export default function JugadoresContactosPanel() {
  const router = useRouter();
  const [contactos, setContactos] = useState<Perfil[]>([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState({
    registrados: 0,
    con_licencia: 0,
    sin_licencia: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<FiltroContactoCrm>("todos");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<FiltroEtiqueta>("todas");

  const fetchContactos = useCallback(
    async (mounted: boolean) => {
      setLoading(true);
      try {
        const etiqueta =
          filtroEtiqueta === "todas" ? undefined : filtroEtiqueta;
        const response = await CrmContactosService.listar(
          page,
          PAGE_SIZE_JUGADORES,
          search,
          filtro,
          etiqueta,
        );
        if (mounted) {
          setContactos(response.data);
          setTotal(response.total);
          if (response.resumen) setResumen(response.resumen);
        }
      } catch (error) {
        console.error("Error al cargar contactos CRM:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    },
    [page, search, filtro, filtroEtiqueta],
  );

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(() => {
      void fetchContactos(mounted);
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [fetchContactos]);

  const chips: {
    id: FiltroContactoCrm | "etiqueta";
    label: string;
    value: number | string;
    onClick: () => void;
    activo: boolean;
  }[] = [
    {
      id: "todos",
      label: "Registrados",
      value: resumen.registrados,
      onClick: () => {
        setFiltro("todos");
        setPage(1);
      },
      activo: filtro === "todos",
    },
    {
      id: "con_licencia",
      label: "Con licencia",
      value: resumen.con_licencia,
      onClick: () => {
        setFiltro("con_licencia");
        setPage(1);
      },
      activo: filtro === "con_licencia",
    },
    {
      id: "sin_licencia",
      label: "Sin licencia",
      value: resumen.sin_licencia,
      onClick: () => {
        setFiltro("sin_licencia");
        setPage(1);
      },
      activo: filtro === "sin_licencia",
    },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs text-gray-400 max-w-3xl">
        Base unificada de jugadores registrados (con o sin carnet). Las etiquetas
        se editan en la ficha de cada contacto y sirven para segmentar
        comunicaciones.
      </p>

      <div className="relative w-full xl:max-w-md">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, DNI o email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full rounded-lg border border-white/5 bg-brand-input pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-brand-chartreuse/50 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onClick}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs whitespace-nowrap transition-colors cursor-pointer ${
              chip.activo
                ? "border-brand-chartreuse/50 bg-brand-chartreuse/10 text-white"
                : "border-white/5 bg-[#111111] text-gray-400 hover:border-white/15"
            }`}
          >
            <span>{chip.label}</span>
            <span className="font-black tabular-nums text-white">
              {chip.value}
            </span>
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-white/10" />
        {(
          [
            { id: "todas" as FiltroEtiqueta, label: "Todas las etiquetas" },
            { id: "marketing" as FiltroEtiqueta, label: "Marketing" },
            { id: "institucional" as FiltroEtiqueta, label: "Institucional" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setFiltroEtiqueta(opt.id);
              setPage(1);
            }}
            className={`inline-flex h-8 items-center rounded-lg border px-2 text-[11px] font-bold transition-colors cursor-pointer ${
              filtroEtiqueta === opt.id
                ? "border-brand-chartreuse/40 text-brand-chartreuse"
                : "border-white/5 text-gray-500 hover:text-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-brand-card xl:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="bg-black/40">
            <tr className="h-8 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gray-400">
              <th className="px-3 py-0 font-bold">Contacto</th>
              <th className="w-[12%] px-3 py-0 font-bold">DNI</th>
              <th className="w-[10%] px-3 py-0 font-bold">Categoría</th>
              <th className="w-[12%] px-3 py-0 font-bold">Licencia</th>
              <th className="w-[14%] px-3 py-0 font-bold">Etiquetas</th>
              <th className="w-[12%] px-3 py-0 font-bold">Residencia</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="h-9 border-b border-white/5">
                  <td colSpan={6} className="px-3">
                    <div className="h-3 animate-pulse rounded bg-white/10" />
                  </td>
                </tr>
              ))
            ) : contactos.length === 0 ? (
              <tr className="h-9">
                <td colSpan={6} className="px-3 text-xs text-gray-500">
                  No se encontraron contactos con los filtros actuales.
                </td>
              </tr>
            ) : (
              contactos.map((jugador) => (
                <tr
                  key={jugador.id}
                  className="h-9 cursor-pointer border-b border-white/5 text-xs text-gray-200 hover:bg-white/[0.03]"
                  onClick={() =>
                    router.push(`/dashboard/jugadores/${jugador.id}`)
                  }
                >
                  <td className="truncate px-3 font-semibold text-white">
                    {nombreListado(jugador)}
                    <span className="mt-0.5 block truncate text-[10px] font-normal text-gray-500">
                      {emailContactoVisible(jugador.email) ?? "Sin email"}
                    </span>
                  </td>
                  <td className="truncate px-3 font-mono">{jugador.dni || "—"}</td>
                  <td className="truncate px-3">
                    {etiquetaCategoria(jugador.categoria_padel) || "—"}
                  </td>
                  <td className="truncate px-3">{estadoLicencia(jugador)}</td>
                  <td className="px-3">
                    <ContactoEtiquetasBadges
                      etiquetas={
                        (jugador as Perfil & {
                          etiquetas_contacto?: ComunicacionesEtiqueta[];
                        }).etiquetas_contacto
                      }
                    />
                  </td>
                  <td className="truncate px-3 text-gray-400">
                    {jugador.lugar_residencia || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 xl:hidden">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-white/10 bg-[#141414]"
            />
          ))
        ) : (
          contactos.map((jugador) => (
            <button
              key={jugador.id}
              type="button"
              onClick={() => router.push(`/dashboard/jugadores/${jugador.id}`)}
              className="rounded-2xl border border-white/10 bg-[#141414] p-4 text-left"
            >
              <p className="text-sm font-bold text-white">
                {nombreListado(jugador)}
              </p>
              <p className="text-xs text-gray-500">{estadoLicencia(jugador)}</p>
              <div className="mt-2">
                <ContactoEtiquetasBadges
                  etiquetas={
                    (jugador as Perfil & {
                      etiquetas_contacto?: ComunicacionesEtiqueta[];
                    }).etiquetas_contacto
                  }
                />
              </div>
            </button>
          ))
        )}
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE_JUGADORES}
        currentCount={contactos.length}
        onPageChange={setPage}
      />
    </div>
  );
}
