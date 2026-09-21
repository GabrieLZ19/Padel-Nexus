"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TorneosService,
  type ProgramacionBoard,
  type BoardPartido,
} from "@/utils/services/torneos";
import { sileo } from "sileo";

export type EstrategiaAuto = "smart" | "continuous";

export interface ProgramadorConfig {
  duracion: 60 | 75 | 90;
  descanso: number;
  estrategia: EstrategiaAuto;
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
    descanso: 60,
    estrategia: "smart",
  });
  const [activeDay, setActiveDay] = useState<string>("");

  const configRef = useRef(config);
  const boardRef = useRef(board);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGenRef = useRef(0);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const applyBoard = useCallback((data: ProgramacionBoard) => {
    setBoard(data);
    setConfig((c) => ({
      ...c,
      duracion: ([60, 75, 90].includes(data.duracion_partido_minutos)
        ? data.duracion_partido_minutos
        : c.duracion) as 60 | 75 | 90,
      descanso: data.descanso_minutos || c.descanso,
    }));
    setActiveDay((prev) => {
      if (prev && data.dias.includes(prev)) return prev;
      return data.dias[0] || "";
    });
  }, []);

  const load = useCallback(async () => {
    if (!torneoId) return;
    setLoading(true);
    try {
      const data = await TorneosService.getProgramacionBoard(torneoId, {
        duracion: configRef.current.duracion,
        descanso: configRef.current.descanso,
      });
      applyBoard(data);
    } catch (e: unknown) {
      sileo.error({ title: apiErrorMessage(e, "Error al cargar el programador") });
    } finally {
      setLoading(false);
    }
  }, [torneoId, applyBoard]);

  useEffect(() => {
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
        const data = await TorneosService.getProgramacionBoard(torneoId, {
          duracion: configRef.current.duracion,
          descanso: configRef.current.descanso,
        });
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

      // Estrategia solo afecta auto-asignar: no recargar grilla.
      if (next && Object.keys(next).length === 1 && next.estrategia != null) {
        return;
      }

      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      configTimerRef.current = setTimeout(async () => {
        setBusy(true);
        try {
          if (next?.duracion != null) {
            await TorneosService.update(torneoId, {
              duracion_partido_minutos: merged.duracion,
            } as Parameters<typeof TorneosService.update>[1]);
          }
          const data = await TorneosService.getProgramacionBoard(torneoId, {
            duracion: merged.duracion,
            descanso: merged.descanso,
          });
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

  const isReadOnly = board?.programacion_estado === "publicado";

  const asignar = useCallback(
    async (
      partidoId: string,
      fechaIso: string,
      canchaLabel: string,
      motivo?: string,
    ) => {
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

  const desasignar = useCallback(
    async (
      partidoId: string,
      motivo?: string,
      opts?: { silent?: boolean },
    ) => {
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
        estrategia: configRef.current.estrategia,
        duracionMinutos: configRef.current.duracion,
        descansoMinutos: configRef.current.descanso,
      });
      applyBoard(data);
      sileo.success({ title: "Auto-asignación aplicada" });
    } catch (e: unknown) {
      sileo.error({ title: apiErrorMessage(e, "Error en auto-asignación") });
    } finally {
      setBusy(false);
    }
  }, [isReadOnly, torneoId, applyBoard]);

  const publicar = useCallback(async () => {
    if (!boardRef.current) return;
    if (boardRef.current.summary.pendientes > 0) {
      sileo.error({
        title: `Faltan ${boardRef.current.summary.pendientes} partidos por asignar`,
      });
      return;
    }
    setBusy(true);
    try {
      await TorneosService.publicarProgramacion(torneoId);
      await load();
      sileo.success({ title: "Programación publicada" });
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
    reloadWithConfig,
    load,
    asignar,
    desasignar,
    limpiar,
    autoAsignar,
    publicar,
    nuevaEdicion,
    issueByPartido,
    partidoEnSlot,
  };
}
