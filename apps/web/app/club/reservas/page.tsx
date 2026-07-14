"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Search, Grid, Clock, DollarSign, X } from "lucide-react";
import { ClubPanelService } from "@/utils/services/club-panel";
import type { Cancha } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import Pagination from "@/components/ui/Pagination";

export default function ClubReservasPage() {
  const [reservas, setReservas] = useState<any[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 15;

  // Filtros
  const [fecha, setFecha] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [canchaId, setCanchaId] = useState("");

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const data = await ClubPanelService.getReservas({
        fecha: fecha || undefined,
        estado_pago: estadoPago || undefined,
        cancha_id: canchaId || undefined,
        page,
        limit,
      });
      setReservas(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error("Error al cargar reservas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, [page, fecha, estadoPago, canchaId]);

  useEffect(() => {
    // Cargar dropdown de canchas
    ClubPanelService.getCanchas()
      .then((data) => setCanchas(data))
      .catch(() => {});
  }, []);

  const formatHora = (time: string) => {
    return time.slice(0, 5);
  };

  const getEstadoPagoStyle = (estado: string) => {
    switch (estado) {
      case "completado":
        return "bg-green-500/10 text-green-500 border border-green-500/20";
      case "pendiente":
        return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
      case "rechazado":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
    }
  };

  const getEstadoPagoNombre = (estado: string) => {
    switch (estado) {
      case "completado":
        return "Completado";
      case "pendiente":
        return "Pendiente";
      case "rechazado":
        return "Rechazado";
      default:
        return estado;
    }
  };

  const resetFiltros = () => {
    setFecha("");
    setEstadoPago("");
    setCanchaId("");
    setPage(1);
  };

  const opcionesCanchas = [
    { value: "", label: "Todas las canchas" },
    ...canchas.map((c) => ({ value: c.id, label: c.nombre })),
  ];

  const opcionesEstadoPago = [
    { value: "", label: "Todos los estados de pago" },
    { value: "pendiente", label: "Pendiente" },
    { value: "completado", label: "Completado" },
    { value: "rechazado", label: "Rechazado" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-white">
            Reservas del Club
          </h1>
          <p className="text-sm text-gray-400 mt-2 font-medium">
            Administre e inspeccione las reservas realizadas por los jugadores
            en sus canchas
          </p>
        </div>
        <Link
          href="/club/reservas/transferencias"
          className="bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shadow-brand-chartreuse/20 flex items-center gap-2 cursor-pointer w-fit"
        >
          Validar Transferencias
        </Link>
      </div>

      {/* Toolbar / Filtros */}
      <div className="bg-brand-card p-4 rounded-3xl border border-brand-white/5 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center shadow-xl">
        {/* Cancha */}
        <div className="flex-1">
          <CustomDropdown
            value={canchaId}
            onChange={(val) => {
              setCanchaId(val);
              setPage(1);
            }}
            options={opcionesCanchas}
            placeholder="Seleccionar cancha"
          />
        </div>

        {/* Estado Pago */}
        <div className="flex-1">
          <CustomDropdown
            value={estadoPago}
            onChange={(val) => {
              setEstadoPago(val);
              setPage(1);
            }}
            options={opcionesEstadoPago}
            placeholder="Estado del pago"
          />
        </div>

        {/* Fecha */}
        <div className="flex-1 relative">
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-2xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
          />
        </div>

        {(fecha || estadoPago || canchaId) && (
          <button
            onClick={resetFiltros}
            className="px-5 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-gray-300 hover:text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <X className="size-4" /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla de reservas */}
      <div className="bg-brand-card border border-brand-white/5 rounded-4xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-brand-white/5 rounded-xl" />
            ))}
          </div>
        ) : reservas.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Calendar className="size-16 mx-auto mb-4 opacity-30 text-brand-chartreuse" />
            <p className="text-lg font-bold text-brand-white mb-1">
              No se encontraron reservas
            </p>
            <p className="text-sm">
              Pruebe cambiando o limpiando los filtros activos
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-white/5 text-gray-500 text-xs font-bold uppercase tracking-widest bg-brand-black/40">
                  <th className="py-5 px-6">Fecha</th>
                  <th className="py-5 px-6">Cancha</th>
                  <th className="py-5 px-6">Horario</th>
                  <th className="py-5 px-6">Jugador</th>
                  <th className="py-5 px-6">Precio</th>
                  <th className="py-5 px-6">Estado Reserva</th>
                  <th className="py-5 px-6">Estado Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5">
                {reservas.map((res) => (
                  <tr
                    key={res.id}
                    className="hover:bg-brand-white/1 transition-colors"
                  >
                    <td className="py-5 px-6 font-bold text-brand-white">
                      {new Date(
                        res.fecha_reserva + "T00:00:00",
                      ).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-5 px-6 text-gray-300 font-medium">
                      {res.turnos?.canchas?.nombre}
                    </td>
                    <td className="py-5 px-6 text-gray-300 font-medium">
                      {formatHora(res.turnos?.hora_inicio)} -{" "}
                      {formatHora(res.turnos?.hora_fin)}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-brand-white">
                          {res.perfiles?.apellido?.toUpperCase()},{" "}
                          {res.perfiles?.nombre}
                        </span>
                        <span className="text-xs text-gray-500">
                          {res.perfiles?.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-6 font-bold text-brand-chartreuse">
                      ${Number(res.turnos?.precio || 0).toLocaleString("es-AR")}
                    </td>
                    <td className="py-5 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                          res.estado_reserva === "confirmada"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {res.estado_reserva}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${getEstadoPagoStyle(res.estado_pago)}`}
                      >
                        {res.estado_pago}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {total > limit && (
        <Pagination
          page={page}
          total={total}
          pageSize={limit}
          currentCount={reservas.length}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
