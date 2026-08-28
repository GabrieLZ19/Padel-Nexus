"use client";

import React, { useState, useEffect } from "react";
import { DragDropPairing, ZonaDrag, ParejaDrag } from "./DragDropPairing";
import { TablaPosicionesZona } from "./TablaPosicionesZona";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Partido, Inscripcion } from "@/utils/types";
import {
  LayoutGrid,
  History,
  Check,
  PenLine,
  RefreshCw,
  Trophy,
  Move,
  X,
  Printer,
} from "lucide-react";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";
import { MatchCard } from "./MatchCard";
import CustomDropdown from "@/components/ui/CustomDropdown";
import {
  getCapacidadesZonasPorReglamento,
  resumirCapacidadesZonas,
} from "@/utils/constants/fapApaRules";
import { generarPdfZonas } from "@/utils/grillaPdf";

interface BracketEditorProps {
  torneoId: string;
  torneo?: Torneo;
  partidos?: Partido[];
  inscripciones?: Inscripcion[];
  onRefresh?: () => void;
  isReadOnly?: boolean;
}

export const BracketEditor: React.FC<BracketEditorProps> = ({
  torneoId,
  torneo,
  partidos = [],
  inscripciones = [],
  onRefresh,
  isReadOnly = false,
}) => {
  const formatoLower = torneo?.formato?.toLowerCase() || "";
  const isEliminatoriaDirecta =
    formatoLower.includes("eliminatoria") || formatoLower.includes("directa");

  const [activeView, setActiveView] = useState<
    "zonas" | "siembra" | "llaves" | "auditoria"
  >(isEliminatoriaDirecta ? "llaves" : "zonas");
  const autoSwitchedToLlave = React.useRef(false);
  const [zonas, setZonas] = useState<ZonaDrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  // Siembra (Eliminatoria Directa) drag-and-drop state
  const [siembraZonas, setSiembraZonas] = useState<ZonaDrag[]>([]);
  const [isSiembraEditing, setIsSiembraEditing] = useState(false);
  const [selectedMatchToEdit, setSelectedMatchToEdit] =
    useState<Partido | null>(null);
  const [showMatchEditModal, setShowMatchEditModal] = useState(false);
  const [modificacionNoDestructiva, setModificacionNoDestructiva] =
    useState(true);
  const [validarCabezasSerie, setValidarCabezasSerie] = useState(true);
  const [auditoriaLogs, setAuditoriaLogs] = useState<any[]>([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);

  const isIndividual = torneo?.modalidad?.toLowerCase() === "individual";

  const [tourStep, setTourStep] = useState<number | null>(null);

  const TOUR_STEPS = [
    {
      title: "1. Generación Automática de Zonas",
      description: `Haz clic en "Generar Cuadro" para mezclar y agrupar a todos los jugadores confirmados en grupos. Esto se realiza siguiendo las normas de ranking oficiales de la FAP (Snake Draft).`,
    },
    {
      title: "2. Reubicar Jugadores (Modo Edición)",
      description: `Haz clic en el botón "Editar" arriba a la derecha. Esto desbloqueará el drag and drop (arrastrar y soltar) para que puedas acomodar los jugadores manualmente en caso de ajustes de última hora.`,
    },
    {
      title: "3. Modificación No Destructiva",
      description: `Cuando este switch está activo (ON), puedes mover jugadores manualmente de una zona a otra sin preocuparte por destruir los partidos o resultados que ya hayan sido jugados en la base de datos.`,
    },
    {
      title: "4. Carga de Resultados",
      description: `Una vez conformados los grupos, avanzá al paso "Resultados" para ingresar los marcadores de cada partido. Las estadísticas (PJ, PG, PTS) de cada zona se calcularán automáticamente en tiempo real bajo los nombres de los jugadores.`,
    },
    {
      title: "5. Generar Cuadro Eliminatorio (Llaves)",
      description: `Una vez disputados todos los partidos grupales y clasificadas las mejores parejas, ve a la pestaña "Llave campeonato" para dar de alta los Playoffs de eliminatoria directa.`,
    },
  ];

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });
  const [matchEditMotivo, setMatchEditMotivo] = useState("");
  const [matchEditBusy, setMatchEditBusy] = useState(false);

  const loadZonas = async () => {
    try {
      setLoading(true);
      const data = await TorneosService.getZonas(torneoId);
      const formattedZonas: ZonaDrag[] = data.map((grupo: any) => ({
        id: grupo.id,
        nombre: grupo.nombre_grupo,
        parejas: grupo.grupo_parejas.map((gp: any) => ({
          id: gp.inscripcion_id,
          seed: gp.seed,
          jugador1_nombre: gp.inscripciones.jugador1_nombre,
          jugador2_nombre: gp.inscripciones.jugador2_nombre,
          club: gp.clubName || "Sin club asignado",
          cabezaDeSerie: gp.cabezaDeSerie,
          usuario_id: gp.inscripciones?.usuario_id ?? null,
          usuario2_id: gp.inscripciones?.usuario2_id ?? null,
          denominacion_nacional:
            gp.inscripciones?.denominacion_nacional ?? null,
        })),
      }));
      setZonas(formattedZonas);
    } catch (error) {
      console.error("Error fetching zonas", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerarZonas = async () => {
    if ((inscripciones || []).length % 2 !== 0) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Cantidad impar de parejas",
        description: `Para generar las zonas de clasificación, la cantidad de participantes confirmados debe ser un número par. Actualmente hay ${(inscripciones || []).length} confirmados.`,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const hayResultados = partidos.some((p) => p.ganador);
    if (modificacionNoDestructiva && hayResultados) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Modificación no destructiva activa",
        description:
          "Hay partidos con resultados. Desactivá el switch 'Modificación no destructiva' si querés regenerar las zonas (se borrarán resultados).",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const runGenerate = async (forzar: boolean) => {
      try {
        setLoading(true);
        await TorneosService.generarZonas(torneoId, undefined, forzar);
        await loadZonas();
        onRefresh?.();
        setFeedbackModal({
          isOpen: true,
          type: "success",
          title: "Zonas Generadas",
          description:
            "Las zonas se han generado automáticamente según el reglamento FAP.",
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } catch (error: any) {
        setFeedbackModal({
          isOpen: true,
          type: "error",
          title: "Error al generar zonas",
          description:
            error.response?.data?.error ||
            error.message ||
            "No se pudieron generar las zonas.",
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } finally {
        setLoading(false);
      }
    };

    if (hayResultados && !modificacionNoDestructiva) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Regeneración destructiva",
        description:
          "Se borrarán todos los partidos y resultados del torneo. ¿Confirmás regenerar las zonas?",
        confirmText: "Sí, regenerar",
        cancelText: "Cancelar",
        onConfirm: async () => {
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
          await runGenerate(true);
        },
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    await runGenerate(false);
  };

  const loadAuditoria = async () => {
    try {
      setLoadingAuditoria(true);
      const data = await TorneosService.getAuditoria(torneoId);
      setAuditoriaLogs(data || []);
    } catch (error) {
      console.error("Error al cargar auditoria:", error);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  useEffect(() => {
    loadZonas();
  }, [torneoId]);

  // Construir siembraZonas a partir de los partidos y las parejas inscriptas confirmadas
  useEffect(() => {
    if (!isEliminatoriaDirecta || partidos.length === 0) return;

    const ROUNDS_ORDER = ["OCTAVOS", "CUARTOS", "SEMIS", "FINAL"];
    const rondas = [...new Set(partidos.map((p) => p.ronda))];
    const primeraRonda =
      rondas
        .filter((r) => ROUNDS_ORDER.includes(r.toUpperCase()))
        .sort(
          (a, b) =>
            ROUNDS_ORDER.indexOf(a.toUpperCase()) -
            ROUNDS_ORDER.indexOf(b.toUpperCase()),
        )[0] ?? rondas[0];

    if (!primeraRonda) return;

    // Obtener los partidos de primera ronda
    const matchesPrimeraRonda = partidos
      .filter((p) => p.ronda === primeraRonda)
      .sort((a, b) => a.orden - b.orden);

    // Recopilar todos los IDs de parejas asignados a partidos de primera ronda
    const assignedIds = new Set<string>();
    matchesPrimeraRonda.forEach((p) => {
      if (p.equipo_a_id) assignedIds.add(p.equipo_a_id);
      if (p.equipo_b_id) assignedIds.add(p.equipo_b_id);
    });

    const zonasGeneradas: ZonaDrag[] = matchesPrimeraRonda.map((p, idx) => {
      const parejas: ParejaDrag[] = [];
      if (p.equipo_a_id && p.equipo_a_j1) {
        parejas.push({
          id: p.equipo_a_id,
          jugador1_nombre: p.equipo_a_j1 ?? "",
          jugador2_nombre: p.equipo_a_j2 ?? null,
          seed: idx * 2 + 1,
          club: p.equipo_a_club || "Sin club asignado",
          usuario_id: p.equipo_a_usuario_id ?? null,
          usuario2_id: p.equipo_a_usuario2_id ?? null,
          denominacion_nacional: p.equipo_a_denominacion ?? null,
        });
      }
      if (p.equipo_b_id && p.equipo_b_j1) {
        parejas.push({
          id: p.equipo_b_id,
          jugador1_nombre: p.equipo_b_j1 ?? "",
          jugador2_nombre: p.equipo_b_j2 ?? null,
          seed: idx * 2 + 2,
          club: p.equipo_b_club || "Sin club asignado",
          usuario_id: p.equipo_b_usuario_id ?? null,
          usuario2_id: p.equipo_b_usuario2_id ?? null,
          denominacion_nacional: p.equipo_b_denominacion ?? null,
        });
      }
      return {
        id: p.id,
        nombre: `Partido ${idx + 1}`,
        parejas,
      };
    });

    // Identificar las parejas que pasaron directamente por BYE (que estan en partidos posteriores como Semis)
    const unassignedInscripciones = (inscripciones || []).filter(
      (ins) => !assignedIds.has(ins.id),
    );

    if (unassignedInscripciones.length > 0) {
      zonasGeneradas.push({
        id: "byes-sembrados",
        nombre: "Clasificados por BYE (Pase directo)",
        parejas: unassignedInscripciones.map((ins: Inscripcion, idx) => ({
          id: ins.id,
          jugador1_nombre: ins.jugador1_nombre || "Jugador 1",
          jugador2_nombre: ins.jugador2_nombre || null,
          seed: 99 + idx,
          club: "Pase directo a Semis",
          usuario_id: ins.usuario_id ?? null,
          usuario2_id: ins.usuario2_id ?? null,
          denominacion_nacional: ins.denominacion_nacional ?? null,
        })),
      });
    }

    setSiembraZonas(zonasGeneradas);
  }, [partidos, inscripciones, isEliminatoriaDirecta]);

  const handleMoveSiembra = (
    inscripcionId: string,
    origenZonaId: string,
    destinoZonaId: string,
  ) => {
    let moved: ParejaDrag | null = null;
    const next = siembraZonas.map((z) => {
      if (z.id === origenZonaId) {
        moved = z.parejas.find((p) => p.id === inscripcionId) ?? null;
        return {
          ...z,
          parejas: z.parejas.filter((p) => p.id !== inscripcionId),
        };
      }
      return z;
    });
    if (moved) {
      setSiembraZonas(
        next.map((z) => {
          if (z.id === destinoZonaId)
            return { ...z, parejas: [...z.parejas, moved!] };
          return z;
        }),
      );
    }
  };

  const handleGuardarSiembra = () => {
    setFeedbackModal({
      isOpen: true,
      type: "warning",
      title: "Confirmar Siembra",
      description:
        "Estás por guardar los cambios en la siembra del cuadro de eliminatorias. Indicá el motivo para que quede registrado en auditoría.",
      confirmText: "Guardar",
      cancelText: "Cancelar",
      showInput: true,
      inputLabel: "Motivo del cambio",
      inputPlaceholder: "Ej: Ajuste manual por pedido del organizador",
      onConfirm: async (motivo?: string) => {
        if (!motivo) return;
        try {
          setFeedbackModal((prev) => ({ ...prev, isLoading: true }));

          const matchesPayload = siembraZonas.map((z) => ({
            id: z.id,
            equipo_a_id: z.parejas[0]?.id || null,
            equipo_b_id: z.parejas[1]?.id || null,
          }));

          await TorneosService.guardarSiembra(torneoId, {
            matches: matchesPayload,
            motivo,
          });
          setIsSiembraEditing(false);
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "Siembra Guardada",
            description:
              "Los cambios en la siembra fueron aplicados y registrados en auditoría.",
            onClose: () => {
              setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
              onRefresh?.();
            },
          });
        } catch (error: any) {
          setFeedbackModal({
            isOpen: true,
            type: "error",
            title: "Error al guardar",
            description: error.message || "No se pudo guardar la siembra.",
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  useEffect(() => {
    if (activeView === "auditoria") {
      loadAuditoria();
    }
  }, [activeView]);

  const handleMovePareja = (
    inscripcionId: string,
    origenId: string,
    destinoId: string,
  ) => {
    let movedPareja: any = null;
    const nextZonas = zonas.map((z) => {
      if (z.id === origenId) {
        movedPareja = z.parejas.find((p) => p.id === inscripcionId);
        return {
          ...z,
          parejas: z.parejas.filter((p) => p.id !== inscripcionId),
        };
      }
      return z;
    });

    if (movedPareja) {
      const finalZonas = nextZonas.map((z) => {
        if (z.id === destinoId) {
          return {
            ...z,
            parejas: [...z.parejas, movedPareja],
          };
        }
        return z;
      });
      setZonas(finalZonas);
    }
  };

  const handleGuardarCambios = () => {
    if (isEditing) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Confirmar Distribución",
        description:
          "Por favor, indica el motivo por el cual modificaste manualmente la disposición de las zonas. Esto quedará registrado en auditoría y re-generará el fixture correspondiente.",
        confirmText: "Guardar",
        cancelText: "Cancelar",
        showInput: true,
        inputLabel: "Motivo del cambio",
        inputPlaceholder: "Ej: Se reubicó por ranking/incompatibilidad",
        onConfirm: async (motivo?: string) => {
          if (!motivo) return;
          try {
            setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
            await TorneosService.guardarZonas(torneoId, {
              zonas: zonas.map((z) => ({
                id: z.id,
                nombre: z.nombre,
                parejas: z.parejas.map((p) => ({ id: p.id })),
              })),
              motivo: motivo,
              validarCabezasSerie: validarCabezasSerie,
            });
            setIsEditing(false);
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "Cambios Guardados",
              description:
                "La disposición de las zonas y los partidos se actualizaron exitosamente.",
              onClose: () => {
                setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
                onRefresh?.();
              },
            });
          } catch (error: any) {
            setFeedbackModal({
              isOpen: true,
              type: "error",
              title: "Error al guardar",
              description:
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                "No se pudieron guardar los cambios.",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          }
        },
        onClose: () => {
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setIsEditing(true);
    }
  };

  const totalParejas = zonas.reduce((acc, z) => acc + z.parejas.length, 0);

  const RONDAS_CONFIG = [
    { id: "OCTAVOS", label: "Octavos", required: 8 },
    { id: "CUARTOS", label: "Cuartos", required: 4 },
    { id: "SEMIS", label: "Semis", required: 2 },
    { id: "FINAL", label: "Final", required: 1 },
  ];

  const getPlayoffSize = (zonasCount: number): number => {
    if (zonasCount <= 1) return 2;
    if (zonasCount === 2 || zonasCount === 3) return 4;
    if (zonasCount >= 4 && zonasCount <= 6) return 8;
    if (zonasCount >= 7 && zonasCount <= 12) return 16;
    return 32;
  };

  const getClasificanTexto = (totalZonas: number) => {
    if (totalZonas <= 0) return "Clasifican 2";
    if (totalZonas === 1) return "Clasifican 2";
    if (totalZonas === 2) return "Clasifican 2 por zona";
    if (totalZonas === 3) return "Clasifica 1 por zona + 1 mejor 2º";
    if (totalZonas === 4) return "Clasifican 2 por zona";
    if (totalZonas === 5) return "Clasifica 1 por zona + 3 mejores 2º";
    if (totalZonas === 6) return "Clasifica 1 por zona + 2 mejores 2º";
    if (totalZonas === 7) return "Clasifica 1 por zona + 9 mejores 2º";
    if (totalZonas === 8) return "Clasifican 2 por zona";
    return "Clasifican 2 por zona";
  };

  const totalZonas =
    zonas.length || Math.floor((torneo?.cupos_maximos || 8) / 3);
  const rawPlayerCount =
    torneo?.formato === "Eliminatoria Directa"
      ? inscripciones?.length ||
        torneo?.cupos_actuales ||
        torneo?.cupos_maximos ||
        16
      : getPlayoffSize(totalZonas);

  const bracketCapacity = Math.max(
    4,
    Math.pow(2, Math.ceil(Math.log2(Math.max(2, rawPlayerCount)))),
  );

  const rondasInPartidos = new Set(
    partidos.map((p) => (p.ronda || "").toUpperCase()),
  );

  const PLAYOFF_ROUND_IDS = ["32AVOS", "16AVOS", "OCTAVOS", "CUARTOS", "SEMIS", "FINAL"];
  const playoffPartidos = partidos.filter((p) =>
    PLAYOFF_ROUND_IDS.includes((p.ronda || "").toUpperCase()),
  );

  const rondasToShow = RONDAS_CONFIG.filter((r) => {
    if (rondasInPartidos.has(r.id)) return true;
    // Sin partidos aún: mostrar rondas del tamaño de llave. Con partidos ya generados,
    // no inventar rondas vacías (evita cuartos fantasma en draws con BYE).
    if (playoffPartidos.length > 0) return false;
    return r.required <= bracketCapacity / 2;
  });

  const getRoundMatches = (round: string, requiredCount: number): Partido[] => {
    const found = partidos
      .filter((p) => (p.ronda || "").toUpperCase() === round.toUpperCase())
      .sort((a, b) => a.orden - b.orden);

    // Si la ronda ya tiene partidos reales (p.ej. 2 cuartos + 2 BYEs en semis),
    // no rellenar slots fantasma: eso rompe visualmente llaves de 6, 12, etc.
    if (found.length > 0) return found;

    const result: Partido[] = [];
    for (let i = 0; i < requiredCount; i++) {
      result.push({
        id: `empty-${round}-${i}`,
        torneo_id: torneoId,
        ronda: round,
        orden: i + 1,
        equipo_a_id: null,
        equipo_a_j1: null,
        equipo_a_j2: null,
        equipo_b_id: null,
        equipo_b_j1: null,
        equipo_b_j2: null,
        set1_a: null,
        set1_b: null,
        ganador: null,
      });
    }
    return result;
  };

  const isZonaRonda = (ronda?: string | null) => {
    const r = String(ronda || "").toUpperCase();
    if (!r || PLAYOFF_ROUND_IDS.includes(r)) return false;
    return r.startsWith("ZONA") || r.includes("GRUPO");
  };

  const partidosZona = partidos.filter((p) => isZonaRonda(p.ronda));
  const faseZonasCerrada =
    partidosZona.length > 0 && partidosZona.every((p) => p.ganador != null);
  const hayResultadoEnZonas = partidosZona.some((p) => p.ganador != null);
  const hayResultadoEnLlave = playoffPartidos.some((p) => p.ganador != null);

  /**
   * FAP: una vez confeccionados zonas/draw, no se modifican salvo fiscal.
   * En CRM: se bloquea edición estructural al cerrar zonas o al cargar el 1er resultado.
   */
  const puedeEditarZonas =
    !isReadOnly &&
    torneo?.estado !== "Finalizado" &&
    !faseZonasCerrada &&
    !hayResultadoEnZonas;

  const puedeEditarLlave =
    !isReadOnly &&
    torneo?.estado !== "Finalizado" &&
    !hayResultadoEnLlave;

  React.useEffect(() => {
    if (autoSwitchedToLlave.current) return;
    if (faseZonasCerrada && playoffPartidos.length > 0 && !isEliminatoriaDirecta) {
      setActiveView("llaves");
      autoSwitchedToLlave.current = true;
    }
  }, [faseZonasCerrada, playoffPartidos.length, isEliminatoriaDirecta]);

  React.useEffect(() => {
    if (!puedeEditarZonas && !puedeEditarLlave && isEditing) {
      setIsEditing(false);
    }
  }, [puedeEditarZonas, puedeEditarLlave, isEditing]);

  const firstPlayoffRound = PLAYOFF_ROUND_IDS.find((r) =>
    playoffPartidos.some((p) => (p.ronda || "").toUpperCase() === r),
  );
  const firstRoundTeams = new Set<string>();
  playoffPartidos
    .filter((p) => (p.ronda || "").toUpperCase() === firstPlayoffRound)
    .forEach((p) => {
      if (p.equipo_a_id) firstRoundTeams.add(p.equipo_a_id);
      if (p.equipo_b_id) firstRoundTeams.add(p.equipo_b_id);
    });

  const slotsPrimeraRonda =
    playoffPartidos.filter(
      (p) => (p.ronda || "").toUpperCase() === firstPlayoffRound,
    ).length * 2;
  const ocupadosPrimeraRonda = firstRoundTeams.size;
  const libresPrimeraRonda = Math.max(0, slotsPrimeraRonda - ocupadosPrimeraRonda);

  const playoffFinalizados = playoffPartidos.filter(
    (p) => p.ganador != null,
  ).length;
  const playoffTotal = playoffPartidos.length;
  const rondaEnCurso = PLAYOFF_ROUND_IDS.find((r) =>
    playoffPartidos.some(
      (p) => (p.ronda || "").toUpperCase() === r && p.ganador == null,
    ),
  );
  const llaveCompleta =
    playoffTotal > 0 && playoffFinalizados === playoffTotal;
  const labelRondaEnCurso = rondaEnCurso
    ? RONDAS_CONFIG.find((r) => r.id === rondaEnCurso)?.label ||
      ({
        "32AVOS": "32avos",
        "16AVOS": "16avos",
      } as Record<string, string>)[rondaEnCurso] ||
      rondaEnCurso
    : null;

  /** Origen de zona por inscripción (seed dentro de la zona = posición provisional). */
  const origenPorInscripcion = React.useMemo(() => {
    const map = new Map<string, string>();
    const sortedZonas = [...zonas].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
    for (const zona of sortedZonas) {
      const zonaNombre = /^zona\s+/i.test(zona.nombre)
        ? zona.nombre.trim()
        : `Zona ${zona.nombre.trim()}`;
      const ordenadas = [...zona.parejas].sort(
        (a, b) => (a.seed || 999) - (b.seed || 999),
      );
      ordenadas.forEach((p, idx) => {
        const puesto = idx + 1;
        map.set(String(p.id), `${zonaNombre} ${puesto}°`);
      });
    }
    return map;
  }, [zonas]);

  const cabezasSerieIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const zona of zonas) {
      for (const p of zona.parejas) {
        if (p.cabezaDeSerie) ids.add(String(p.id));
      }
    }
    return ids;
  }, [zonas]);

  const inscripcionOptions = React.useMemo(() => {
    return (inscripciones || []).map((ins) => {
      const row = ins as Inscripcion & {
        jugador_1_nombre?: string;
        jugador1_nombre?: string;
        jugador1?: { nombre?: string };
        jugador_2_nombre?: string;
        jugador2_nombre?: string;
        jugador2?: { nombre?: string };
      };
      const name1 =
        row.jugador_1_nombre ||
        row.jugador1_nombre ||
        row.jugador1?.nombre ||
        "Jugador 1";
      const name2 =
        row.jugador_2_nombre ||
        row.jugador2_nombre ||
        row.jugador2?.nombre ||
        "";
      const enLlave = firstRoundTeams.has(ins.id);
      return {
        value: ins.id,
        label: name2
          ? `${name1} / ${name2}${enLlave ? " · En llave" : ""}`
          : `${name1}${enLlave ? " · En llave" : ""}`,
        name1,
        name2,
      };
    });
  }, [inscripciones, firstRoundTeams]);

  const applyInscripcionToSlot = (
    slot: "a" | "b",
    newId: string,
  ) => {
    const found = inscripcionOptions.find((o) => o.value === newId);
    setSelectedMatchToEdit((prev) => {
      if (!prev) return prev;
      if (slot === "a") {
        return {
          ...prev,
          equipo_a_id: newId || null,
          equipo_a_j1: newId ? found?.name1 || null : null,
          equipo_a_j2: newId ? found?.name2 || null : null,
        };
      }
      return {
        ...prev,
        equipo_b_id: newId || null,
        equipo_b_j1: newId ? found?.name1 || null : null,
        equipo_b_j2: newId ? found?.name2 || null : null,
      };
    });
  };

  const handleGuardarMatchEdit = async () => {
    if (!selectedMatchToEdit) return;
    if (!matchEditMotivo.trim()) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Motivo obligatorio",
        description: "Indicá el motivo del cambio para auditoría.",
        onClose: () =>
          setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }
    try {
      setMatchEditBusy(true);
      await TorneosService.actualizarEquiposPartido(selectedMatchToEdit.id, {
        equipo_a_id: selectedMatchToEdit.equipo_a_id || null,
        equipo_b_id: selectedMatchToEdit.equipo_b_id || null,
        motivo: matchEditMotivo.trim(),
      });
      setShowMatchEditModal(false);
      setSelectedMatchToEdit(null);
      setMatchEditMotivo("");
      onRefresh?.();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "Error al actualizar",
        description:
          e.response?.data?.error ||
          e.message ||
          "No se pudo actualizar la pareja del partido.",
        onClose: () =>
          setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setMatchEditBusy(false);
    }
  };

  return (
    <div className="bg-brand-card border border-brand-input rounded-3xl p-4 sm:p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="font-extrabold text-xl sm:text-2xl text-brand-white tracking-tight uppercase">
            EDITOR DE LLAVES — {torneo?.nombre || "TORNEO"} ·{" "}
            {torneo?.categoria || "CATEGORÍA"}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {faseZonasCerrada
              ? "Fase de grupos finalizada. La competencia continúa en la llave de campeonato."
              : "El sistema armó zonas y siembra automáticamente. Podés ajustar manualmente sin borrar resultados."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tutorial y Editar solo si la fase de grupos aún admite cambios */}
          {torneo?.formato !== "Eliminatoria Directa" &&
            activeView === "zonas" &&
            puedeEditarZonas && (
              <>
                <button
                  onClick={() => {
                    setActiveView("zonas");
                    setTourStep(0);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-brand-chartreuse/25 text-brand-chartreuse hover:bg-brand-chartreuse/5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Tutorial
                </button>
                {isEditing && (
                  <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase tracking-wider">
                    <PenLine className="size-3.5" /> Modo edición
                  </div>
                )}
                {isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      void loadZonas();
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  id="btn-editar"
                  onClick={handleGuardarCambios}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#ccff00] text-black hover:bg-[#b3e600] transition-all relative ${
                    tourStep === 1
                      ? "ring-4 ring-brand-chartreuse shadow-[0_0_20px_rgba(204,255,0,0.6)] z-101"
                      : ""
                  }`}
                >
                  {isEditing ? (
                    <>
                      <Check className="size-4" /> Guardar cambios
                    </>
                  ) : (
                    <>
                      <PenLine className="size-4" /> Editar
                    </>
                  )}
                </button>
              </>
            )}
          {faseZonasCerrada && activeView === "zonas" && (
            <button
              type="button"
              onClick={() => setActiveView("llaves")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-chartreuse text-brand-black hover:bg-[#b3e600] transition-all"
            >
              <Trophy className="size-4" /> Ver llave
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center bg-transparent border-b border-white/5 mb-6 gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2">
          {isEliminatoriaDirecta ? (
            <button
              onClick={() => setActiveView("siembra")}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-colors shrink-0 ${
                activeView === "siembra"
                  ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
                  : "border border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <LayoutGrid className="size-4" /> Zonas
            </button>
          ) : (
            <button
              onClick={() => setActiveView("zonas")}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-colors shrink-0 ${
                activeView === "zonas"
                  ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
                  : "border border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <LayoutGrid className="size-4" /> Fase de grupos
            </button>
          )}
          <button
            id="tab-llaves-indicador"
            onClick={() => setActiveView("llaves")}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-all relative shrink-0 ${
              activeView === "llaves"
                ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
                : "border border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Trophy className="size-4" /> Llave campeonato
          </button>
          <button
            onClick={() => setActiveView("auditoria")}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-colors shrink-0 ${
              activeView === "auditoria"
                ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
                : "border border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <History className="size-4" /> Auditoría
          </button>
        </div>
      </div>

      {/* PANEL SIEMBRA — Drag & Drop primera ronda de Eliminatoria Directa */}
      {activeView === "siembra" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="font-bold text-white text-lg">Cuadro</h4>
              <p className="text-gray-400 text-sm mt-1">
                Arrastrá y soltá {isIndividual ? "jugadores" : "parejas"} entre
                los partidos para modificar el cuadro de primera ronda.
              </p>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-3">
                {isSiembraEditing && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase tracking-wider">
                    <PenLine className="size-3.5" /> Modo edición
                  </div>
                )}
                {isSiembraEditing && (
                  <button
                    onClick={() => {
                      setIsSiembraEditing(false);
                      // Recargar siembra desde partidos originales
                      onRefresh?.();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={
                    isSiembraEditing
                      ? handleGuardarSiembra
                      : () => setIsSiembraEditing(true)
                  }
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#ccff00] text-black hover:bg-[#b3e600] transition-all"
                >
                  {isSiembraEditing ? (
                    <>
                      <Check className="size-4" /> Guardar
                    </>
                  ) : (
                    <>
                      <PenLine className="size-4" /> Editar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          {siembraZonas.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              No hay partidos de primera ronda cargados. Generá el fixture
              primero.
            </div>
          ) : (
            <DragDropPairing
              zonas={siembraZonas}
              onZonasChange={setSiembraZonas}
              onMovePareja={handleMoveSiembra}
              isEditing={isSiembraEditing}
              partidos={[]}
              isSiembra={true}
            />
          )}
        </div>
      )}

      {activeView === "zonas" && (
        <div className="space-y-6">
          {(inscripciones || []).length % 2 !== 0 && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-extrabold px-4 py-3.5 rounded-xl">
              ⚠️ Se requiere una cantidad par de participantes confirmados para
              poder generar las zonas de la fase de grupos. Actualmente hay{" "}
              {(inscripciones || []).length} confirmados.
            </div>
          )}
          {(inscripciones || []).length % 2 === 0 &&
            (inscripciones || []).some(
              (ins) => ins.estado_pago !== "Confirmado",
            ) && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-extrabold px-4 py-3.5 rounded-xl">
                Todos los inscritos deben estar confirmados/aprobados para poder
                generar las zonas de la fase de grupos.
              </div>
            )}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {puedeEditarZonas && (
              <button
                id="btn-regenerar"
                onClick={handleRegenerarZonas}
                disabled={
                  (inscripciones || []).length % 2 !== 0 ||
                  (inscripciones || []).some(
                    (ins) => ins.estado_pago !== "Confirmado",
                  )
                }
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-all relative disabled:opacity-40 disabled:cursor-not-allowed ${
                  tourStep === 0 &&
                  (inscripciones || []).length % 2 === 0 &&
                  !(inscripciones || []).some(
                    (ins) => ins.estado_pago !== "Confirmado",
                  )
                    ? "ring-4 ring-brand-chartreuse shadow-[0_0_20px_rgba(204,255,0,0.6)] z-101 bg-brand-card text-brand-white border-brand-chartreuse"
                    : ""
                }`}
              >
                <RefreshCw className="size-4 text-gray-400" /> Generar Cuadros
              </button>
              )}

              <button
                type="button"
                disabled={zonas.length === 0}
                onClick={() => {
                  if (!torneo || zonas.length === 0) return;
                  generarPdfZonas(torneo, zonas, partidos);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer className="size-4 text-gray-400" /> Publicar zonas
              </button>

        
            </div>
            {puedeEditarZonas && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div
                id="btn-validar-cabezas"
                className="flex items-center justify-between w-full sm:w-auto px-4 py-2.5 border border-brand-chartreuse/10 rounded-2xl bg-white/5 transition-all relative gap-4"
              >
                <span className="text-sm font-semibold text-gray-300">
                  Validación de cabezas de serie
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setValidarCabezasSerie(!validarCabezasSerie)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${validarCabezasSerie ? "bg-brand-chartreuse" : "bg-gray-600"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${validarCabezasSerie ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                  <span
                    className={`text-xs font-black w-6 text-center ${validarCabezasSerie ? "text-brand-chartreuse" : "text-gray-500"}`}
                  >
                    ON
                  </span>
                </div>
              </div>

              <div
                id="btn-no-destructivo"
                className={`flex items-center justify-between w-full sm:w-auto px-4 py-2.5 border border-brand-chartreuse/10 rounded-2xl bg-white/5 transition-all relative gap-4 ${
                  tourStep === 2
                    ? "ring-4 ring-brand-chartreuse shadow-[0_0_20px_rgba(204,255,0,0.6)] z-101 bg-brand-card text-brand-white border-brand-chartreuse"
                    : ""
                }`}
              >
                <span className="text-sm font-semibold text-gray-300">
                  Modificación no destructiva
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setModificacionNoDestructiva(!modificacionNoDestructiva)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modificacionNoDestructiva ? "bg-brand-chartreuse" : "bg-gray-600"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${modificacionNoDestructiva ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                  <span
                    className={`text-xs font-black w-6 text-center ${modificacionNoDestructiva ? "text-brand-chartreuse" : "text-gray-500"}`}
                  >
                    ON
                  </span>
                </div>
              </div>
            </div>
            )}
          </div>

          {puedeEditarZonas && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Move className="size-3.5" />{" "}
            {isIndividual
              ? "Arrastrá un jugador a un slot para reubicarlo."
              : "Arrastrá una pareja a un slot para reubicarla."}
          </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-white/5 pb-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h4 className="text-xl font-bold text-white">
                {faseZonasCerrada
                  ? "Resultados de zonas"
                  : "Zonas de clasificación"}
              </h4>
              {faseZonasCerrada && (
              <span className="px-3 py-1 bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-brand-chartreuse text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0">
                <Check className="size-3.5" /> Fase consolidada
              </span>
              )}
            </div>
            <div className="text-gray-500 text-xs sm:text-sm font-medium">
              {zonas.length} zonas · {totalParejas}{" "}
              {isIndividual ? "jugadores" : "parejas"} ·{" "}
              {getClasificanTexto(zonas.length)}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 text-brand-chartreuse animate-pulse">
              Cargando zonas...
            </div>
          ) : zonas.length > 0 ? (
            <div className="space-y-8">
              {/* MODO EDICIÓN: drag-and-drop para mover parejas */}
              {isEditing && puedeEditarZonas ? (
                <DragDropPairing
                  zonas={zonas}
                  onZonasChange={setZonas}
                  onMovePareja={handleMovePareja}
                  isEditing={isEditing}
                  partidos={partidos}
                />
              ) : (
                /* VISTA NORMAL: tablas de posiciones estilo FAP */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {zonas.map((z) => {
                    const partidosZona = partidos.filter(
                      (p) => p.ronda?.toUpperCase() === z.nombre?.toUpperCase(),
                    );
                    return (
                      <TablaPosicionesZona
                        key={z.id}
                        nombreZona={z.nombre}
                        parejasInscritas={z.parejas}
                        partidosZona={partidosZona}
                        alcance={torneo?.alcance}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              Las zonas aún no han sido generadas.
            </div>
          )}
        </div>
      )}

      {activeView === "llaves" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h4 className="text-lg font-extrabold text-white tracking-tight">
                Llave de campeonato
              </h4>
              <p className="text-sm text-gray-400 mt-0.5 max-w-xl">
                {puedeEditarLlave
                  ? "Tocá un partido para agregar, cambiar o quitar parejas. El motivo queda en auditoría."
                  : "Estructura fija. Los marcadores se cargan en Resultados."}
              </p>
            </div>
            {playoffPartidos.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold shrink-0">
                <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-gray-300">
                  {llaveCompleta ? (
                    <>
                      Llave{" "}
                      <span className="text-brand-chartreuse">completada</span>
                    </>
                  ) : (
                    <>
                      {labelRondaEnCurso ? (
                        <>
                          {labelRondaEnCurso}
                          <span className="text-gray-600 mx-1.5">·</span>
                        </>
                      ) : null}
                      Progreso{" "}
                      <span className="text-brand-chartreuse tabular-nums">
                        {playoffFinalizados}
                      </span>
                      <span className="text-gray-500">
                        /{playoffTotal} partidos
                      </span>
                    </>
                  )}
                </span>
                {puedeEditarLlave && libresPrimeraRonda > 0 && (
                  <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-amber-400">
                    Primera ronda {ocupadosPrimeraRonda}/{slotsPrimeraRonda} ·{" "}
                    {libresPrimeraRonda} libre
                    {libresPrimeraRonda === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="relative rounded-2xl border border-brand-input bg-brand-card overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(110,137,1,0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(56,189,248,0.06), transparent 50%)",
              }}
            />
            <div className="relative p-4 sm:p-6 overflow-x-auto">
              {playoffPartidos.length === 0 && partidos.length === 0 ? (
                <div className="text-center p-12 text-gray-500 border border-dashed border-brand-input rounded-2xl">
                  Aún no se ha generado el cuadro de eliminatoria para este
                  torneo.
                </div>
              ) : (
                <div className="flex gap-0 min-w-max pb-4 pt-1">
                  {rondasToShow.map((ronda, rondaIndex) => (
                    <div
                      key={ronda.id}
                      className="flex flex-col w-[21rem] sm:w-[24.5rem]"
                    >
                      <h3 className="text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.22em] mb-6">
                        {ronda.label}
                      </h3>
                      <div className="flex flex-col flex-1 justify-around gap-10">
                        {getRoundMatches(ronda.id, ronda.required).map(
                          (partido, i) => (
                            <div
                              key={partido.id}
                              className={`relative flex flex-col justify-center ${
                                rondaIndex < rondasToShow.length - 1
                                  ? "pr-7"
                                  : "pr-1"
                              } ${rondaIndex > 0 ? "pl-7" : "pl-1"}`}
                            >
                              <MatchCard
                                partido={partido}
                                isInteractive={puedeEditarLlave}
                                alcance={torneo?.alcance}
                                origenEquipoA={
                                  partido.equipo_a_id
                                    ? origenPorInscripcion.get(
                                        String(partido.equipo_a_id),
                                      ) || null
                                    : null
                                }
                                origenEquipoB={
                                  partido.equipo_b_id
                                    ? origenPorInscripcion.get(
                                        String(partido.equipo_b_id),
                                      ) || null
                                    : null
                                }
                                esCabezaSerieA={
                                  !!partido.equipo_a_id &&
                                  cabezasSerieIds.has(
                                    String(partido.equipo_a_id),
                                  )
                                }
                                esCabezaSerieB={
                                  !!partido.equipo_b_id &&
                                  cabezasSerieIds.has(
                                    String(partido.equipo_b_id),
                                  )
                                }
                                onEditSelect={(pToEdit) => {
                                  setSelectedMatchToEdit({ ...pToEdit });
                                  setMatchEditMotivo("");
                                  setShowMatchEditModal(true);
                                }}
                                isActive={
                                  partido.ganador === null &&
                                  partido.equipo_a_id !== null &&
                                  partido.equipo_b_id !== null
                                }
                              />

                              {rondaIndex > 0 && (
                                <div className="absolute left-0 top-1/2 w-7 h-px bg-brand-input -translate-y-1/2 pointer-events-none" />
                              )}
                              {rondaIndex < rondasToShow.length - 1 && (
                                <>
                                  <div className="absolute right-0 top-1/2 w-7 h-px bg-brand-input -translate-y-1/2 pointer-events-none" />
                                  {i % 2 === 0 ? (
                                    <div className="absolute right-0 top-1/2 w-px h-[calc(50%+1rem)] bg-brand-input pointer-events-none" />
                                  ) : (
                                    <div className="absolute right-0 bottom-1/2 w-px h-[calc(50%+1rem)] bg-brand-input pointer-events-none" />
                                  )}
                                </>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === "auditoria" && (
        <div className="bg-[#111111] rounded-3xl border border-white/5 p-6 space-y-4">
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            Historial de Auditoría Administrativa
          </h4>

          {loadingAuditoria ? (
            <div className="text-center p-8 text-brand-chartreuse animate-pulse text-sm">
              Cargando registros...
            </div>
          ) : auditoriaLogs.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              No se han registrado modificaciones manuales para este torneo.
            </div>
          ) : (
            <div className="space-y-3 max-h-125 overflow-y-auto pr-1">
              {auditoriaLogs.map((log) => {
                const fecha = new Date(log.created_at).toLocaleString("es-AR");
                const adminName = log.perfiles
                  ? `${log.perfiles.nombre} ${log.perfiles.apellido}`
                  : "Administrador";

                return (
                  <div
                    key={log.id}
                    className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-brand-chartreuse text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {log.accion.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">
                          {fecha}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm font-semibold">
                        Por: <span className="text-white">{adminName}</span>
                      </p>
                      {log.detalles?.motivo && (
                        <p className="text-xs text-yellow-500 italic mt-1 bg-yellow-500/5 border border-yellow-500/10 px-3 py-1 rounded-lg inline-block">
                          Motivo: &quot;{log.detalles.motivo}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <FeedbackModal {...feedbackModal} />

      {/* FLOATING TOUR OVERLAY / STEP-BY-STEP DIALOG */}
      {tourStep !== null && (
        <>
          {/* Backdrop: z-100 */}
          <div
            className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm"
            onClick={() => setTourStep(null)}
          />

          {/* Dialog Wrapper: z-110 (rendered above z-101 highlighted siblings) */}
          <div className="fixed inset-0 z-110 flex items-center justify-center pointer-events-none p-4">
            <div className="bg-brand-card border border-brand-chartreuse/30 p-6 rounded-3xl max-w-md w-full shadow-[0_10px_50px_rgba(204,255,0,0.15)] animate-in fade-in zoom-in duration-200 pointer-events-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-brand-chartreuse uppercase tracking-widest bg-brand-chartreuse/10 px-2.5 py-1 rounded-full">
                  Paso {tourStep + 1} de {TOUR_STEPS.length}
                </span>
                <button
                  onClick={() => setTourStep(null)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <h4 className="text-lg font-bold text-white mb-2">
                {TOUR_STEPS[tourStep].title}
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                {TOUR_STEPS[tourStep].description}
              </p>

              <div className="flex justify-between items-center">
                <button
                  disabled={tourStep === 0}
                  onClick={() => setTourStep((prev) => prev! - 1)}
                  className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  onClick={() => {
                    if (tourStep < TOUR_STEPS.length - 1) {
                      setTourStep((prev) => prev! + 1);
                    } else {
                      setTourStep(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-chartreuse text-brand-black hover:bg-[#b3e600] transition-colors cursor-pointer"
                >
                  {tourStep === TOUR_STEPS.length - 1
                    ? "Entendido"
                    : "Siguiente"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Modal: gestionar pareja en un partido de la llave */}
      {showMatchEditModal && selectedMatchToEdit && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/8 bg-white/[0.02]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-chartreuse mb-1">
                  {selectedMatchToEdit.ronda || "Llave de campeonato"}
                </p>
                <h4 className="text-white font-extrabold text-lg tracking-tight">
                  Gestionar partido
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Asigná o vaciá cada lado. Guardar exige un motivo de auditoría.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMatchEditModal(false);
                  setSelectedMatchToEdit(null);
                  setMatchEditMotivo("");
                }}
                className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                    Lado A
                  </label>
                  {selectedMatchToEdit.equipo_a_id && (
                    <button
                      type="button"
                      onClick={() => applyInscripcionToSlot("a", "")}
                      className="text-[10px] font-bold uppercase tracking-wide text-red-400/90 hover:text-red-300"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <CustomDropdown
                  value={selectedMatchToEdit.equipo_a_id || ""}
                  onChange={(newId) => applyInscripcionToSlot("a", newId)}
                  options={[
                    { value: "", label: "Vacío / BYE" },
                    ...inscripcionOptions.map((o) => ({
                      value: o.value,
                      label: o.label,
                    })),
                  ]}
                  placeholder="Seleccionar pareja A..."
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                    Lado B
                  </label>
                  {selectedMatchToEdit.equipo_b_id && (
                    <button
                      type="button"
                      onClick={() => applyInscripcionToSlot("b", "")}
                      className="text-[10px] font-bold uppercase tracking-wide text-red-400/90 hover:text-red-300"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <CustomDropdown
                  value={selectedMatchToEdit.equipo_b_id || ""}
                  onChange={(newId) => applyInscripcionToSlot("b", newId)}
                  options={[
                    { value: "", label: "Vacío / BYE" },
                    ...inscripcionOptions.map((o) => ({
                      value: o.value,
                      label: o.label,
                    })),
                  ]}
                  placeholder="Seleccionar pareja B..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                  Motivo (auditoría)
                </label>
                <input
                  type="text"
                  value={matchEditMotivo}
                  onChange={(e) => setMatchEditMotivo(e.target.value)}
                  placeholder="Ej: Reasignación por baja / error de categoría"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-chartreuse/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/8 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => {
                  setShowMatchEditModal(false);
                  setSelectedMatchToEdit(null);
                  setMatchEditMotivo("");
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-gray-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={matchEditBusy}
                onClick={() => void handleGuardarMatchEdit()}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-brand-chartreuse text-brand-black hover:bg-[#b3e600] disabled:opacity-40"
              >
                {matchEditBusy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
