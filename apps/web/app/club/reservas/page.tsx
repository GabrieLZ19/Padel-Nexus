"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  Check,
  List,
  UserX,
  X,
} from "lucide-react";
import { sileo } from "sileo";
import {
  ClubPanelService,
  type AccionReservaClub,
  type AgendaReservasClub,
  type ReservaClubFila,
} from "@/utils/services/club-panel";
import type { Cancha } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import Pagination from "@/components/ui/Pagination";
import FeedbackModal, { type FeedbackModalProps } from "@/components/ui/FeedbackModal";
import { formatFechaCalendario } from "@/utils/formatFecha";

type VistaReservas = "lista" | "agenda";

function hoyLocal() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function uno<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function horaCorta(valor?: string | null) {
  return (valor || "").slice(0, 5);
}

function mensajeError(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { error?: string } } }).response?.data;
    if (data?.error) return data.error;
  }
  return err instanceof Error ? err.message : "No se pudo completar la acción.";
}

const ETIQUETA_RESERVA: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  ausente: "Ausente",
};

const ETIQUETA_PAGO: Record<string, string> = {
  pendiente: "Pago pendiente",
  completado: "Pagado",
  rechazado: "Pago rechazado",
};

export default function ClubReservasPage() {
  const hoy = hoyLocal();
  const [reservas, setReservas] = useState<ReservaClubFila[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [agenda, setAgenda] = useState<AgendaReservasClub | null>(null);
  const [total, setTotal] = useState(0);
  const [atrasadas, setAtrasadas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [vista, setVista] = useState<VistaReservas>("lista");
  const [fecha, setFecha] = useState(hoy);
  const [estadoPago, setEstadoPago] = useState("");
  const [canchaId, setCanchaId] = useState("");
  const [soloAtrasadas, setSoloAtrasadas] = useState(false);
  const [modal, setModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setModal((prev) => ({ ...prev, isOpen: false })),
  });
  const limit = 20;

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const data = await ClubPanelService.getReservas({
        fecha: soloAtrasadas ? undefined : fecha || undefined,
        estado_pago: soloAtrasadas ? undefined : estadoPago || undefined,
        cancha_id: canchaId || undefined,
        solo_atrasadas: soloAtrasadas,
        page,
        limit,
      });
      setReservas(data.data);
      setTotal(data.total);
      setAtrasadas(data.atrasadas);
    } catch (err) {
      sileo.error({ title: "No se pudieron cargar las reservas", description: mensajeError(err) });
    } finally {
      setLoading(false);
    }
  };

  const cargarAgenda = async () => {
    if (!fecha) return;
    try {
      setAgenda(await ClubPanelService.getAgenda(fecha));
    } catch (err) {
      sileo.error({ title: "No se pudo armar la agenda", description: mensajeError(err) });
    }
  };

  useEffect(() => {
    void cargarReservas();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga al cambiar filtros
  }, [page, fecha, estadoPago, canchaId, soloAtrasadas]);

  useEffect(() => {
    if (vista === "agenda") void cargarAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la agenda sigue a la fecha
  }, [vista, fecha]);

  useEffect(() => {
    ClubPanelService.getCanchas()
      .then((data) => setCanchas(data))
      .catch(() => {});
  }, []);

  const ejecutar = async (reservaId: string, accion: AccionReservaClub) => {
    setModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await ClubPanelService.gestionarReserva(reservaId, accion);
      setModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
      const titulos: Record<AccionReservaClub, string> = {
        confirmar: "Reserva confirmada",
        cobrar: "Pago registrado",
        cancelar: "Reserva cancelada",
        ausente: "Ausencia marcada",
      };
      sileo.success({ title: titulos[accion] });
      await cargarReservas();
      if (vista === "agenda") await cargarAgenda();
    } catch (err) {
      setModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
      sileo.error({ title: "No se pudo guardar", description: mensajeError(err) });
    }
  };

  const pedirAccion = (reserva: ReservaClubFila, accion: AccionReservaClub) => {
    const perfil = uno(reserva.perfiles);
    const turno = uno(reserva.turnos);
    const jugador = [perfil?.apellido, perfil?.nombre].filter(Boolean).join(", ");
    const precio = Number(turno?.precio || 0).toLocaleString("es-AR");
    const textos: Record<AccionReservaClub, { title: string; description: string; type: FeedbackModalProps["type"]; confirmText: string }> = {
      confirmar: {
        title: "Confirmar reserva",
        description: `La reserva de ${jugador || "este jugador"} queda confirmada. El pago sigue como está.`,
        type: "info",
        confirmText: "Confirmar",
      },
      cobrar: {
        title: "Registrar pago",
        description: `Se registra el pago en efectivo de $${precio} sin salir de esta pantalla.`,
        type: "success",
        confirmText: "Registrar pago",
      },
      cancelar: {
        title: "Cancelar reserva",
        description: `Se cancela el turno de ${jugador || "este jugador"}.`,
        type: "danger",
        confirmText: "Cancelar reserva",
      },
      ausente: {
        title: "Marcar ausencia",
        description: `${jugador || "El jugador"} no se presentó a este turno.`,
        type: "warning",
        confirmText: "Marcar ausencia",
      },
    };
    const texto = textos[accion];
    setModal({
      isOpen: true,
      title: texto.title,
      description: texto.description,
      type: texto.type,
      confirmText: texto.confirmText,
      cancelText: "Volver",
      onClose: () => setModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: () => void ejecutar(reserva.id, accion),
    });
  };

  const opcionesCanchas = [
    { value: "", label: "Todas las canchas" },
    ...canchas.map((cancha) => ({ value: cancha.id, label: cancha.nombre })),
  ];

  const opcionesEstadoPago = [
    { value: "", label: "Todos los pagos" },
    { value: "pendiente", label: "Pendiente" },
    { value: "completado", label: "Pagado" },
    { value: "rechazado", label: "Rechazado" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-white">Reservas</h1>
          <p className="text-sm text-gray-400">Confirmá, cobrá o cancelá sin salir del listado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-brand-card p-1">
            <button
              type="button"
              onClick={() => setVista("lista")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer ${
                vista === "lista" ? "bg-brand-chartreuse text-brand-card" : "text-gray-400"
              }`}
            >
              <List className="size-4" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setVista("agenda")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer ${
                vista === "agenda" ? "bg-brand-chartreuse text-brand-card" : "text-gray-400"
              }`}
            >
              <CalendarDays className="size-4" /> Agenda
            </button>
          </div>
          <Link
            href="/club/reservas/transferencias"
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-brand-white"
          >
            Transferencias
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="lg:w-56">
          <CustomDropdown
            value={canchaId}
            onChange={(val) => {
              setCanchaId(val);
              setPage(1);
            }}
            options={opcionesCanchas}
            placeholder="Cancha"
          />
        </div>
        <div className="lg:w-48">
          <CustomDropdown
            value={estadoPago}
            onChange={(val) => {
              setSoloAtrasadas(false);
              setEstadoPago(val);
              setPage(1);
            }}
            options={opcionesEstadoPago}
            placeholder="Pago"
          />
        </div>
        <input
          type="date"
          value={soloAtrasadas ? "" : fecha}
          onChange={(event) => {
            setSoloAtrasadas(false);
            setFecha(event.target.value);
            setPage(1);
          }}
          className="w-full lg:w-44 rounded-xl border border-white/10 bg-brand-card px-3 py-2.5 text-sm text-brand-white"
        />
        <button
          type="button"
          onClick={() => {
            setFecha(hoy);
            setEstadoPago("");
            setCanchaId("");
            setSoloAtrasadas(false);
            setPage(1);
          }}
          className="rounded-xl px-3 py-2 text-sm font-bold text-gray-400 hover:text-white cursor-pointer"
        >
          Hoy
        </button>
      </div>

      {atrasadas > 0 && !soloAtrasadas && (
        <button
          type="button"
          onClick={() => {
            setSoloAtrasadas(true);
            setPage(1);
          }}
          className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-sm font-semibold text-amber-700 cursor-pointer"
        >
          {atrasadas} reserva{atrasadas === 1 ? "" : "s"} pasada{atrasadas === 1 ? "" : "s"} sin confirmar
        </button>
      )}

      {vista === "agenda" ? (
        <AgendaDia agenda={agenda} fecha={fecha || hoy} onAccion={pedirAccion} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-brand-card">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : reservas.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              {soloAtrasadas
                ? "No hay reservas pasadas sin confirmar."
                : "No hay reservas para esta fecha."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Horario</th>
                    <th className="px-3 py-2">Cancha</th>
                    <th className="px-3 py-2">Jugador</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => (
                    <FilaReserva
                      key={reserva.id}
                      reserva={reserva}
                      hoy={hoy}
                      onAccion={pedirAccion}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {vista === "lista" && total > limit && (
        <Pagination
          page={page}
          total={total}
          pageSize={limit}
          currentCount={reservas.length}
          onPageChange={setPage}
        />
      )}

      <FeedbackModal {...modal} />
    </div>
  );
}

function FilaReserva({
  reserva,
  hoy,
  onAccion,
}: {
  reserva: ReservaClubFila;
  hoy: string;
  onAccion: (reserva: ReservaClubFila, accion: AccionReservaClub) => void;
}) {
  const perfil = uno(reserva.perfiles);
  const turno = uno(reserva.turnos);
  const cancha = uno(turno?.canchas);
  const atrasada = reserva.estado_reserva === "pendiente" && reserva.fecha_reserva < hoy;
  const cerrada = reserva.estado_reserva === "cancelada" || reserva.estado_reserva === "ausente";

  return (
    <tr className={`border-b border-white/5 ${atrasada ? "bg-amber-500/10" : ""}`}>
      <td className="whitespace-nowrap px-3 py-2 font-semibold text-brand-white">
        {formatFechaCalendario(reserva.fecha_reserva, { day: "2-digit", month: "short" })}
        {atrasada ? (
          <span className="ml-2 text-[10px] font-black uppercase text-amber-700">Atrasada</span>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-gray-500">
        {horaCorta(turno?.hora_inicio)}–{horaCorta(turno?.hora_fin)}
      </td>
      <td className="max-w-[160px] truncate px-3 py-2" title={cancha?.nombre || "Cancha"}>
        {cancha?.nombre || "Cancha"}
      </td>
      <td className="max-w-[160px] truncate px-3 py-2">
        {[perfil?.apellido, perfil?.nombre].filter(Boolean).join(", ") || "Jugador"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-semibold">
        ${Number(turno?.precio || 0).toLocaleString("es-AR")}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-xs">
        <span className="font-bold">{ETIQUETA_RESERVA[reserva.estado_reserva] || reserva.estado_reserva}</span>
        <span className="ml-2 text-gray-500">{ETIQUETA_PAGO[reserva.estado_pago] || reserva.estado_pago}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5">
        <div className="flex items-center gap-1">
          {reserva.estado_reserva === "pendiente" && (
            <Accion icon={Check} label="Confirmar" onClick={() => onAccion(reserva, "confirmar")} />
          )}
          {!cerrada && reserva.estado_pago !== "completado" && (
            <Accion icon={Banknote} label="Registrar pago" onClick={() => onAccion(reserva, "cobrar")} />
          )}
          {!cerrada && (
            <Accion icon={UserX} label="Ausente" onClick={() => onAccion(reserva, "ausente")} />
          )}
          {reserva.estado_reserva !== "cancelada" && (
            <Accion icon={X} label="Cancelar" onClick={() => onAccion(reserva, "cancelar")} peligro />
          )}
        </div>
      </td>
    </tr>
  );
}

function Accion({
  icon: Icon,
  label,
  onClick,
  peligro = false,
}: {
  icon: typeof Check;
  label: string;
  onClick: () => void;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex size-7 items-center justify-center rounded-lg border cursor-pointer ${
        peligro
          ? "border-red-500/30 text-red-600 hover:bg-red-500/10"
          : "border-white/10 text-brand-white hover:border-brand-chartreuse hover:text-brand-chartreuse"
      }`}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function AgendaDia({
  agenda,
  fecha,
  onAccion,
}: {
  agenda: AgendaReservasClub | null;
  fecha: string;
  onAccion: (reserva: ReservaClubFila, accion: AccionReservaClub) => void;
}) {
  if (!agenda) {
    return <p className="text-sm text-gray-500">Cargando la agenda…</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-brand-card">
      <div className="border-b border-white/10 px-3 py-2 text-sm font-bold text-brand-white">
        {formatFechaCalendario(fecha, { weekday: "long", day: "numeric", month: "long" })}
        <span className="ml-2 font-medium text-gray-500">{agenda.canchas.length} canchas</span>
      </div>
      {agenda.canchas.length === 0 ? (
        <p className="px-3 py-8 text-sm text-gray-500">Este club no tiene canchas activas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-500">
                <th className="sticky left-0 bg-brand-card px-3 py-2">Hora</th>
                {agenda.canchas.map((cancha) => (
                  <th key={cancha.id} className="px-2 py-2 font-bold" title={cancha.nombre}>
                    {cancha.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agenda.filas.length === 0 ? (
                <tr>
                  <td colSpan={agenda.canchas.length + 1} className="px-3 py-8 text-sm text-gray-500">
                    No hay turnos cargados para este día. Las canchas igual quedan en la grilla.
                  </td>
                </tr>
              ) : (
                agenda.filas.map((fila) => (
                  <tr key={fila.hora_inicio} className="border-b border-white/5">
                    <td className="sticky left-0 bg-brand-card whitespace-nowrap px-3 py-2 font-semibold">
                      {fila.hora_inicio}
                    </td>
                    {fila.celdas.map((celda) => (
                      <td key={celda.cancha_id} className="px-2 py-1.5 align-top">
                        {!celda.turno_id ? (
                          <span className="text-gray-400">—</span>
                        ) : !celda.reserva ? (
                          <span className="text-gray-400">Libre</span>
                        ) : (
                          <button
                            type="button"
                            className="block w-full rounded-lg bg-white/5 px-2 py-1 text-left hover:bg-white/10 cursor-pointer"
                            onClick={() =>
                              onAccion(
                                {
                                  id: celda.reserva!.id,
                                  fecha_reserva: fecha,
                                  estado_reserva: celda.reserva!.estado_reserva,
                                  estado_pago: celda.reserva!.estado_pago,
                                  perfiles: { apellido: celda.reserva!.jugador, nombre: "" },
                                  turnos: {
                                    precio: celda.reserva!.precio,
                                    hora_inicio: fila.hora_inicio,
                                    hora_fin: fila.hora_fin,
                                  },
                                },
                                celda.reserva!.estado_pago === "completado" ? "ausente" : "cobrar",
                              )
                            }
                          >
                            <span className="block truncate font-semibold text-brand-white">
                              {celda.reserva.jugador}
                            </span>
                            <span className="text-[10px] uppercase text-gray-500">
                              {ETIQUETA_RESERVA[celda.reserva.estado_reserva] || celda.reserva.estado_reserva}
                            </span>
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
