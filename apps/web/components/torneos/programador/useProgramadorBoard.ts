"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TorneosService,
  type ProgramacionBoard,
  type BoardPartido,
} from "@/utils/services/torneos";
import { sileo } from "sileo";
import { motivoPublicacionBloqueada } from "@/utils/programadorPublicar";

export type ModoDescansoProgramador =
  | "tras_fin_60"
  | "tras_fin_120"
  | "entre_inicios_240";

export type DistribucionProgramacion = "zonas_primero" | "continua";

export interface ProgramadorConfig {
  duracion: 60 | 75 | 90;
  descansoModo: ModoDescansoProgramador;
  distribucion: DistribucionProgramacion;
  jornadas: 0 | 1 | 2 | 3 | 4;
  horaInicio: string;
  horaFin: string;
  franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
}

function boardQuery(
  config: ProgramadorConfig,
  opts?: { incluirDescansoPreview?: boolean },
) {
  return {
    duracion: config.duracion,
    ...(opts?.incluirDescansoPreview
      ? { descansoModo: config.descansoModo }
      : {}),
    ...(config.jornadas ? { jornadas: config.jornadas } : {}),
    // No forzar 08:00: si está vacío, el backend usa la franja/disponibilidad de cada día.
    ...(config.horaInicio ? { horaInicio: config.horaInicio } : {}),
    ...(config.horaFin ? { horaFin: config.horaFin } : {}),
    ...(config.franjasPorDia && Object.keys(config.franjasPorDia).length > 0
      ? { franjasPorDia: JSON.stringify(config.franjasPorDia) }
      : {}),
  };
}

const CONFIG_DEBOUNCE_MS = 400;
const SYNC_DEBOUNCE_MS = 350;

function apiErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "response" in e) {
    return String(
      (e as { response?: { data?: { error?: string } } }).response?.data
        ?.error || fallback,
    );
  }
  return fallback;
}

export function useProgramadorBoard(torneoId: string) {
  const [board, setBoard] = useState<ProgramacionBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [config, setConfig] = useState<ProgramadorConfig>({
    duracion: 90,
    descansoModo: "tras_fin_60",
    distribucion: "zonas_primero",
    jornadas: 0,
    horaInicio: "",
    horaFin: "",
  });
  const [activeDay, setActiveDay] = useState<string>("");

  const configRef = useRef(config);
  const boardRef = useRef(board);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGenRef = useRef(0);
  const configHidratadaRef = useRef(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const applyBoard = useCallback((data: ProgramacionBoard) => {
    configHidratadaRef.current = true;
    setBoard(data);
    setConfig((c) => {
      const descansoBoard = data.descanso_modo;
      const descansoValido =
        descansoBoard === "tras_fin_60" ||
        descansoBoard === "tras_fin_120" ||
        descansoBoard === "entre_inicios_240"
          ? descansoBoard
          : c.descansoModo;
      return {
        ...c,
        duracion: ([60, 75, 90].includes(data.duracion_partido_minutos)
          ? data.duracion_partido_minutos
          : c.duracion) as 60 | 75 | 90,
        // El backend es la fuente de verdad del descanso persistido.
        descansoModo: descansoValido,
        franjasPorDia: {
          ...(c.franjasPorDia || {}),
          ...(data.franjas_por_dia || {}),
        },
      };
    });
    setActiveDay((prev) => {
      if (prev && data.dias.includes(prev)) return prev;
      return data.dias[0] || "";
    });
  }, []);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!torneoId) return;
      if (!options?.silent && !boardRef.current) {
        setLoading(true);
      } else {
        setSyncing(true);
      }
      try {
        const data = await TorneosService.getProgramacionBoard(
          torneoId,
          boardQuery(configRef.current, {
            incluirDescansoPreview: configHidratadaRef.current,
          }),
        );
        applyBoard(data);
      } catch (e: unknown) {
        sileo.error({ title: apiErrorMessage(e, "Error al cargar el programador") });
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [torneoId, applyBoard],
  );

  useEffect(() => {
    configHidratadaRef.current = false;
    void load();
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (configTimerRef.current) clearTimeout(configTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneoId]);

  const scheduleBoardSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    const gen = ++syncGenRef.current;
    syncTimerRef.current = setTimeout(async () => {
      setSyncing(true);
      try {
        const data = await TorneosService.getProgramacionBoard(
          torneoId,
          boardQuery(configRef.current, {
            incluirDescansoPreview: configHidratadaRef.current,
          }),
        );
        if (gen !== syncGenRef.current) return;
        applyBoard(data);
      } catch {
        // Silencioso: la UI optimista ya está; el próximo drop resincroniza.
      } finally {
        if (gen === syncGenRef.current) setSyncing(false);
      }
    }, SYNC_DEBOUNCE_MS);
  }, [torneoId, applyBoard]);

  const reloadWithConfig = useCallback(
    (next?: Partial<ProgramadorConfig>) => {
      const merged = { ...configRef.current, ...next };
      setConfig(merged);
      configRef.current = merged;

      // La distribución solo cambia el orden del auto-asignar.
      if (
        next &&
        Object.keys(next).length === 1 &&
        next.distribucion != null
      ) {
        return;
      }

      const debePersistir =
        next?.duracion != null ||
        next?.descansoModo != null ||
        next?.franjasPorDia != null;

      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      configTimerRef.current = setTimeout(async () => {
        setBusy(true);
        try {
          if (debePersistir) {
            await TorneosService.persistirConfigProgramacion(torneoId, {
              duracionMinutos: merged.duracion,
              descansoModo: merged.descansoModo,
              ...(merged.franjasPorDia && Object.keys(merged.franjasPorDia).length > 0
                ? { franjasPorDia: merged.franjasPorDia }
                : {}),
            });
          }
          const data = await TorneosService.getProgramacionBoard(
            torneoId,
            boardQuery(merged, { incluirDescansoPreview: true }),
          );
          applyBoard(data);
        } catch {
          sileo.error({ title: "No se pudo actualizar la grilla" });
        } finally {
          setBusy(false);
        }
      }, CONFIG_DEBOUNCE_MS);
    },
    [torneoId, applyBoard],
  );

  const bloqueadoPorAlcance = board?.solo_lectura === true;
  const isReadOnly =
    board?.programacion_estado === "publicado" || bloqueadoPorAlcance;

  const asignar = useCallback(
    async (
      partidoId: string,
      fechaIso: string,
      canchaLabel: string,
      motivo?: string,
    ) => {
      if (boardRef.current?.solo_lectura) {
        sileo.error({
          title: "Solo lectura",
          description:
            boardRef.current.aviso_alcance ||
            "No podés cambiar los horarios de este torneo.",
        });
        return;
      }
      if (isReadOnly) {
        sileo.error({
          title: "Programación publicada",
          description: "Creá una nueva edición para editar.",
        });
        return;
      }
      const prev = boardRef.current;
      const slotKey =
        prev?.slots.find(
          (s) => s.fecha_iso === fechaIso && s.cancha_label === canchaLabel,
        )?.key ?? null;

      if (prev) {
        const partidos = prev.partidos.map((p) => {
          if (p.id === partidoId) {
            return {
              ...p,
              assigned: true,
              cancha_asignada: canchaLabel,
              fecha_partido: fechaIso,
              slot_key: slotKey,
              horario_bloqueado: true,
            };
          }
          // Liberar slot ocupado por otro (swap optimista)
          if (
            p.assigned &&
            p.cancha_asignada === canchaLabel &&
            p.fecha_partido === fechaIso &&
            p.id !== partidoId
          ) {
            return {
              ...p,
              assigned: false,
              cancha_asignada: null,
              fecha_partido: null,
              slot_key: null,
              horario_bloqueado: false,
            };
          }
          return p;
        });
        const asignados = partidos.filter((p) => p.assigned).length;
        setBoard({
          ...prev,
          partidos,
          summary: {
            ...prev.summary,
            asignados,
            pendientes: partidos.length - asignados,
          },
        });
      }

      try {
        await TorneosService.asignarProgramacion(torneoId, {
          partido_id: partidoId,
          fecha_iso: fechaIso,
          cancha_label: canchaLabel,
          motivo,
        });
        scheduleBoardSync();
      } catch (e: unknown) {
        if (prev) setBoard(prev);
        sileo.error({ title: apiErrorMessage(e, "No se pudo asignar") });
      }
    },
    [isReadOnly, torneoId, scheduleBoardSync],
  );

  const asignarLote = useCallback(
    async (
      partidoIds: string[],
      diaTarget?: string,
      motivo?: string,
    ) => {
      if (boardRef.current?.solo_lectura) {
        sileo.error({
          title: "Solo lectura",
          description:
            boardRef.current.aviso_alcance ||
            "No podés cambiar los horarios de este torneo.",
        });
        return;
      }
      if (isReadOnly) {
        sileo.error({
          title: "Programación publicada",
          description: "Creá una nueva edición para editar.",
        });
        return;
      }
      if (!partidoIds.length) return;

      setBusy(true);
      const prev = boardRef.current;

      try {
        const data = await TorneosService.asignarLoteProgramacion(torneoId, {
          partido_ids: partidoIds,
          dia: diaTarget || activeDay,
          motivo,
        });
        applyBoard(data);
        const lote = data.asignacion_lote;
        if (lote && lote.sin_slot_ids.length > 0) {
          sileo.warning({
            title: "Asignación parcial",
            description: `Se asignaron ${lote.asignados} de ${lote.solicitados}. Sin espacio para ${lote.sin_slot_ids.length}.`,
          });
        } else {
          const asignados = lote?.asignados ?? partidoIds.length;
          if (asignados === 0) {
            sileo.warning({
              title: "Sin cambios",
              description: "Ningún partido pudo ubicarse en la grilla.",
            });
          } else {
            sileo.success({
              title: "Partidos asignados",
              description: `Se ubicaron ${asignados} partido${asignados === 1 ? "" : "s"} en la grilla.`,
            });
          }
        }
      } catch (e: unknown) {
        if (prev) setBoard(prev);
        sileo.error({
          title: apiErrorMessage(e, "Error al asignar partidos en lote"),
        });
      } finally {
        setBusy(false);
      }
    },
    [isReadOnly, torneoId, activeDay, applyBoard],
  );

  const desasignar = useCallback(
    async (
      partidoId: string,
      motivo?: string,
      opts?: { silent?: boolean },
    ) => {
      if (boardRef.current?.solo_lectura) {
        if (!opts?.silent) {
          sileo.error({
            title: "Solo lectura",
            description:
              boardRef.current.aviso_alcance ||
              "No podés cambiar los horarios de este torneo.",
          });
        }
        return;
      }
      if (isReadOnly) {
        sileo.error({
          title: "Programación publicada",
          description: "Creá una nueva edición para editar.",
        });
        return;
      }
      const prev = boardRef.current;
      if (prev && !opts?.silent) {
        const partidos = prev.partidos.map((p) =>
          p.id === partidoId
            ? {
                ...p,
                assigned: false,
                cancha_asignada: null,
                fecha_partido: null,
                slot_key: null,
                horario_bloqueado: false,
              }
            : p,
        );
        const asignados = partidos.filter((p) => p.assigned).length;
        setBoard({
          ...prev,
          partidos,
          summary: {
            ...prev.summary,
            asignados,
            pendientes: partidos.length - asignados,
          },
        });
      }

      try {
        await TorneosService.desasignarProgramacion(torneoId, {
          partido_id: partidoId,
          motivo,
        });
        scheduleBoardSync();
      } catch (e: unknown) {
        if (prev && !opts?.silent) setBoard(prev);
        sileo.error({ title: apiErrorMessage(e, "No se pudo desasignar") });
      }
    },
    [isReadOnly, torneoId, scheduleBoardSync],
  );

  const limpiar = useCallback(async () => {
    if (isReadOnly) return;
    setBusy(true);
    try {
      const data = await TorneosService.limpiarProgramacion(torneoId, {
        motivo: "Limpiar programación desde el programador visual",
      });
      applyBoard(data);
      sileo.success({ title: "Programación limpia", description: "Podés empezar de cero." });
    } catch (e: unknown) {
      sileo.error({ title: apiErrorMessage(e, "No se pudo limpiar") });
    } finally {
      setBusy(false);
    }
  }, [isReadOnly, torneoId, applyBoard]);

  const autoAsignar = useCallback(async () => {
    if (isReadOnly) return;
    setBusy(true);
    try {
      const data = await TorneosService.autoAsignarProgramacion(torneoId, {
        distribucion: configRef.current.distribucion,
        duracionMinutos: configRef.current.duracion,
        descansoModo: configRef.current.descansoModo,
        ...(configRef.current.jornadas
          ? { jornadas: configRef.current.jornadas }
          : {}),
        ...(configRef.current.horaInicio
          ? { horaInicio: configRef.current.horaInicio }
          : {}),
        ...(configRef.current.horaFin
          ? { horaFin: configRef.current.horaFin }
          : {}),
        ...(configRef.current.franjasPorDia
          ? { franjasPorDia: configRef.current.franjasPorDia }
          : {}),
      });
      applyBoard(data);
      const pendientes = data.summary?.pendientes ?? 0;
      if (pendientes > 0) {
        sileo.warning({
          title: "Auto-asignación incompleta",
          description: `Quedan ${pendientes} partido${pendientes === 1 ? "" : "s"} sin horario. Revisá canchas, descanso o el día activo.`,
        });
      } else {
        sileo.success({ title: "Auto-asignación aplicada" });
      }
    } catch (e: unknown) {
      sileo.error({ title: apiErrorMessage(e, "Error en auto-asignación") });
    } finally {
      setBusy(false);
    }
  }, [isReadOnly, torneoId, applyBoard]);

  const guardarBorrador = useCallback(async () => {
    if (isReadOnly) return;
    setBusy(true);
    try {
      const actual = configRef.current;
      const data = await TorneosService.guardarBorradorProgramacion(torneoId, {
        motivo: "Guardar borrador desde el programador visual",
        duracionMinutos: actual.duracion,
        descansoModo: actual.descansoModo,
        ...(actual.jornadas ? { jornadas: actual.jornadas } : {}),
        ...(actual.horaInicio ? { horaInicio: actual.horaInicio } : {}),
        ...(actual.horaFin ? { horaFin: actual.horaFin } : {}),
        ...(actual.franjasPorDia ? { franjasPorDia: actual.franjasPorDia } : {}),
      });
      applyBoard(data);
      sileo.success({
        title: "Borrador guardado",
        description: "Los horarios quedaron cargados y todavía no son públicos.",
      });
    } catch (e: unknown) {
      sileo.error({ title: apiErrorMessage(e, "No se pudo guardar el borrador") });
    } finally {
      setBusy(false);
    }
  }, [isReadOnly, torneoId, applyBoard]);

  const publicar = useCallback(async () => {
    if (!boardRef.current) return;
    const motivo = motivoPublicacionBloqueada(boardRef.current);
    if (motivo) {
      sileo.warning({
        title: "Todavía no se puede publicar",
        description: motivo,
      });
      return;
    }
    setBusy(true);
    try {
      const yaEnCurso = boardRef.current?.estado === "En curso";
      await TorneosService.publicarProgramacion(torneoId);
      await load();
      sileo.success({
        title: "Programación publicada",
        description: yaEnCurso
          ? "Los horarios quedaron visibles."
          : "El torneo pasó a En curso. Ya se pueden cargar resultados.",
      });
    } catch (e: unknown) {
      sileo.error({ title: apiErrorMessage(e, "No se pudo publicar") });
    } finally {
      setBusy(false);
    }
  }, [load, torneoId]);

  const nuevaEdicion = useCallback(
    async (motivo?: string) => {
      setBusy(true);
      try {
        const data = await TorneosService.nuevaEdicionProgramacion(torneoId, {
          motivo: motivo || "Nueva edición de programación",
        });
        applyBoard(data);
        sileo.success({ title: "Edición abierta" });
      } catch (e: unknown) {
        sileo.error({ title: apiErrorMessage(e, "No se pudo abrir edición") });
      } finally {
        setBusy(false);
      }
    },
    [torneoId, applyBoard],
  );

  const issueByPartido = useCallback(
    (partidoId: string) =>
      board?.issues.find((i) => i.partido_id === partidoId) || null,
    [board],
  );

  const partidoEnSlot = useCallback(
    (slotKey: string): BoardPartido | undefined => {
      if (!board) return undefined;
      return board.partidos.find((p) => {
        if (!p.assigned || !p.cancha_asignada || !p.fecha_partido) return false;
        if (p.slot_key === slotKey) return true;
        const slot = board.slots.find((s) => s.key === slotKey);
        if (!slot) return false;
        return (
          p.cancha_asignada === slot.cancha_label &&
          p.fecha_partido === slot.fecha_iso
        );
      });
    },
    [board],
  );

  return {
    board,
    loading,
    busy,
    syncing,
    config,
    setConfig,
    activeDay,
    setActiveDay,
    isReadOnly,
    bloqueadoPorAlcance,
    reloadWithConfig,
    load,
    asignar,
    asignarLote,
    desasignar,
    limpiar,
    autoAsignar,
    guardarBorrador,
    publicar,
    nuevaEdicion,
    issueByPartido,
    partidoEnSlot,
  };
}
