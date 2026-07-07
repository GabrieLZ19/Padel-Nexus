"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  GitMerge,
  Trophy,
  LayoutDashboard,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  User,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import { TorneosService } from "../../../../utils/services/torneos";
import { PagosService } from "../../../../utils/services/pagos";
import { InscripcionesService } from "../../../../utils/services/inscripciones";
import { Torneo, Inscripcion, Partido } from "../../../../utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "../../../../components/ui/FeedbackModal";
import { LiveArbitrajeRow } from "@/components/torneos/LiveArbitrajeRow";
import { BracketEditor } from "@/components/torneos/BracketEditor";
import ConfirmarPagoModal from "@/components/inscripciones/ConfirmarPagoModal";
import InscripcionManualModal from "@/components/inscripciones/InscripcionManualModal";

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "inscritos", label: "Inscritos Aprobados", icon: Users },
  { id: "cuadros", label: "Cuadros y Llaves", icon: GitMerge },
  { id: "resultados", label: "Arbitraje en Vivo", icon: Trophy },
];

const cleanName = (name?: string | null) => {
  if (!name) return "Desconocido";
  let cleaned = name
    .trim()
    .replace(/^[\s,]+/, "")
    .replace(/[\s,]+$/, "");
  if (cleaned === "," || cleaned === "") return "Desconocido";
  return cleaned;
};

export default function TorneoDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);

  const [activeTab, setActiveTab] = useState<string>("resumen");
  const [loading, setLoading] = useState<boolean>(true);
  const [generando, setGenerando] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [pagoModal, setPagoModal] = useState<{
    isOpen: boolean;
    inscripcionId: string;
    montoDefecto: number;
    isLoading: boolean;
  }>({
    isOpen: false,
    inscripcionId: "",
    montoDefecto: 0,
    isLoading: false,
  });

  const [guardandoPartidoId, setGuardandoPartidoId] = useState<string | null>(
    null,
  );

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const [importingCSV, setImportingCSV] = useState(false);

  const handleDescargarPlantilla = () => {
    if (!torneo) return;
    const isIndiv = torneo.modalidad === "Individual";
    const headers = isIndiv
      ? [
          "Jugador (DNI o Email)",
          "Metodo de Pago (Efectivo / Transferencia / Dejar vacio)",
        ]
      : [
          "Jugador 1 (DNI o Email)",
          "Jugador 2 (DNI o Email)",
          "Metodo de Pago (Efectivo / Transferencia / Dejar vacio)",
        ];

    const exampleRows = isIndiv
      ? [
          ["jugador@email.com", "Efectivo"],
          ["40123456", "Transferencia"],
          ["otro_jugador@email.com", ""],
        ]
      : [
          ["jugador1@email.com", "jugador2@email.com", "Efectivo"],
          ["40123456", "41765432", "Transferencia"],
          ["otro_j1@email.com", "otro_j2@email.com", ""],
        ];

    // UTF-8 BOM so Excel opens accents correctly
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...exampleRows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `plantilla_inscripcion_${torneo.modalidad.toLowerCase()}_${torneo.nombre.toLowerCase().replace(/\s+/g, "_")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubirCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !torneo) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length <= 1) {
        setFeedbackModal({
          isOpen: true,
          type: "error",
          title: "Archivo vacío",
          description:
            "El archivo no contiene filas de datos (solo cabecera o vacío).",
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
        return;
      }

      setImportingCSV(true);
      let successCount = 0;
      let errors: string[] = [];

      const dataRows = lines.slice(1);
      const isIndiv = torneo.modalidad === "Individual";

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const delimiter = row.includes(";") ? ";" : ",";
        const parts = row
          .split(delimiter)
          .map((p) => p.trim().replace(/^["']|["']$/g, ""));

        if (isIndiv) {
          const identificador = parts[0];
          const metodo = parts[1] || "";
          if (!identificador) continue;

          try {
            await InscripcionesService.inscribirManual({
              torneo_id: torneo.id,
              jugador1_identificador: identificador,
              monto: Number(torneo.precio_inscripcion || 0),
              metodo_pago: metodo || undefined,
            });
            successCount++;
          } catch (err: any) {
            const errMsg =
              err.response?.data?.error || err.message || "Error desconocido";
            errors.push(`Fila ${i + 2} (${identificador}): ${errMsg}`);
          }
        } else {
          // Duplas
          const j1 = parts[0];
          const j2 = parts[1];
          const metodo = parts[2] || "";
          if (!j1) continue;

          try {
            await InscripcionesService.inscribirManual({
              torneo_id: torneo.id,
              jugador1_identificador: j1,
              jugador2_identificador: j2 || undefined,
              monto: Number(torneo.precio_inscripcion || 0),
              metodo_pago: metodo || undefined,
            });
            successCount++;
          } catch (err: any) {
            const errMsg =
              err.response?.data?.error || err.message || "Error desconocido";
            errors.push(`Fila ${i + 2} (${j1}/${j2 || "N/A"}): ${errMsg}`);
          }
        }
      }

      setImportingCSV(false);
      setRefreshKey((prev) => prev + 1);

      if (errors.length === 0) {
        setFeedbackModal({
          isOpen: true,
          type: "success",
          title: "Inscripción Masiva Completada",
          description: `Se inscribieron exitosamente ${successCount} ${isIndiv ? "jugadores" : "parejas"}.`,
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } else {
        setFeedbackModal({
          isOpen: true,
          type: "warning",
          title: "Inscripción con Advertencias",
          description: `Se inscribieron ${successCount} participantes. Fallaron ${errors.length}:\n\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? "\n... entre otros." : ""}`,
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const showErrorModal = (msg: string) => {
    setFeedbackModal({
      isOpen: true,
      type: "warning",
      title: "Atención",
      description: msg,
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const fetchTorneoData = async () => {
      try {
        if (isMounted && refreshKey === 0) setLoading(true);
        const [dataTorneo, dataInscripciones, dataPartidos] = await Promise.all(
          [
            TorneosService.getById(id),
            TorneosService.getInscripcionesConfirmadas(id).catch(
              () => [] as Inscripcion[],
            ),
            TorneosService.getPartidos(id).catch(() => [] as Partido[]),
          ],
        );

        if (isMounted) {
          setTorneo(dataTorneo);
          setInscripciones(dataInscripciones as Inscripcion[]);
          setPartidos(dataPartidos as Partido[]);
        }
      } catch (error) {
        console.error("Error al cargar los datos del torneo:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchTorneoData();
    return () => {
      isMounted = false;
    };
  }, [id, refreshKey]);

  const handleGenerarCuadro = async () => {
    if (inscripciones.length < 4) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Cupos insuficientes",
        description: `Se necesitan al menos 4 inscripciones confirmadas para armar llaves. Actual: ${inscripciones.length}.`,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    if (inscripciones.length % 2 !== 0) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Cantidad impar de parejas",
        description: `Para generar el fixture de eliminatorias, la cantidad de participantes confirmados debe ser un número par. Actualmente hay ${inscripciones.length} confirmados.`,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const tienePendientes = inscripciones.some(
      (ins) => ins.estado_pago !== "Confirmado",
    );
    if (tienePendientes) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Inscripciones pendientes",
        description:
          "Existen inscripciones con pago pendiente. Todos los participantes deben estar confirmados/aprobados antes de generar el fixture.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const isPrimeraVez = partidos.length === 0;

    const executeGeneration = async () => {
      try {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
        setGenerando(true);
        await TorneosService.generarCuadro(id);

        router.refresh();
        setRefreshKey((prev) => prev + 1);
        setActiveTab("cuadros");

        setFeedbackModal({
          isOpen: true,
          type: "success",
          title: "¡Cuadro Generado!",
          description: "El fixture automático se ha estructurado con éxito.",
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } catch (error: unknown) {
        const errMsg =
          error instanceof Error ? error.message : "Fallo la generación.";
        setFeedbackModal({
          isOpen: true,
          type: "error",
          title: "Error operativo",
          description: errMsg,
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } finally {
        setGenerando(false);
      }
    };

    if (isPrimeraVez) {
      // Modal amigable para la primera vez
      setFeedbackModal({
        isOpen: true,
        type: "info",
        title: "Generar Fixture",
        description:
          "Se crearán los cruces aleatorios basados en las inscripciones confirmadas. El torneo pasará automáticamente a estado 'En curso'.",
        confirmText: "Generar Cuadro",
        cancelText: "Cancelar",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: executeGeneration,
      });
    } else {
      // Modal de peligro si están queriendo pisar un cuadro ya existente
      setFeedbackModal({
        isOpen: true,
        type: "danger",
        title: "¡Atención! Acción destructiva",
        description:
          "¿Estás completamente seguro de regenerar el cuadro? Esto borrará el fixture actual y todos los resultados cargados.",
        confirmText: "Sí, Borrar y Regenerar",
        cancelText: "Cancelar",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: executeGeneration,
      });
    }
  };

  const handleEliminarInscripcion = (inscripcionId: string | number) => {
    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "¿Eliminar inscripción?",
      description:
        "Esta acción no se puede deshacer y liberará los cupos del torneo. ¿Estás seguro de que deseas eliminar este inscrito?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        try {
          setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
          await InscripcionesService.eliminar(inscripcionId);
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "Inscripción eliminada",
            description:
              "La inscripción fue eliminada exitosamente y el cupo ha sido liberado.",
            onClose: () => {
              setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
              setRefreshKey((prev) => prev + 1);
            },
          });
        } catch (error: any) {
          console.error("Error al eliminar la inscripción:", error);
          setFeedbackModal({
            isOpen: true,
            type: "error",
            title: "Error al eliminar",
            description:
              error.response?.data?.message ||
              "Ocurrió un error inesperado al intentar eliminar la inscripción.",
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const handleGuardarResultadoLive = async (
    partidoId: string,
    setA: number,
    setB: number,
    ganadorId: string,
  ) => {
    try {
      setGuardandoPartidoId(partidoId);
      await TorneosService.actualizarResultado(partidoId, {
        ganador_id: ganadorId,
        set1_a: setA,
        set1_b: setB,
      });

      router.refresh();
      setRefreshKey((prev) => prev + 1);

      setFeedbackModal({
        isOpen: true,
        type: "success",
        title: "¡Set Finalizado!",
        description:
          "El marcador fue guardado y el ganador avanzó en la llave.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error
          ? error.message
          : "Error al impactar el marcador.";
      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: errMsg,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setGuardandoPartidoId(null);
    }
  };

  // =============================================================
  // 1. SKELETON PREMIUM (Reemplaza el "Cargando centro de control")
  // =============================================================
  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 md:px-10 md:py-10 animate-pulse min-h-screen bg-[#111111]">
        <div className="w-32 h-6 bg-white/5 rounded-md mb-8"></div>
        <div className="bg-[#161616] rounded-3xl p-8 lg:p-12 mb-8 border border-white/5">
          <div className="w-48 h-6 bg-white/10 rounded-full mb-6"></div>
          <div className="w-3/4 h-12 bg-white/10 rounded-xl mb-4"></div>
          <div className="flex gap-4">
            <div className="w-32 h-4 bg-white/10 rounded-md"></div>
            <div className="w-32 h-4 bg-white/10 rounded-md"></div>
          </div>
        </div>
        <div className="flex gap-6 mb-8 border-b border-white/10 pb-4">
          <div className="w-24 h-6 bg-white/10 rounded-md"></div>
          <div className="w-32 h-6 bg-white/10 rounded-md"></div>
          <div className="w-32 h-6 bg-white/10 rounded-md"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-[#161616] rounded-3xl border border-white/5"></div>
          <div className="h-40 bg-[#161616] rounded-3xl border border-white/5"></div>
          <div className="h-40 bg-[#161616] rounded-3xl border border-white/5"></div>
        </div>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center text-center px-4 bg-[#111111]">
        <Trophy className="size-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Torneo no encontrado
        </h2>
        <button
          onClick={() => router.push("/dashboard/torneos")}
          className="bg-white/10 px-6 py-2.5 rounded-xl font-semibold mt-6"
        >
          Volver
        </button>
      </div>
    );
  }

  // --- VARIABLES DE ESTADO Y FILTRADO ---
  const confirmadasCount = inscripciones.filter(
    (i) => i.estado_pago === "Confirmado",
  ).length;
  const totalRecaudado = inscripciones
    .filter((i) => i.estado_pago === "Confirmado")
    .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  const porcentajeOcupacion = Math.round(
    (confirmadasCount / (torneo.cupos_maximos || 1)) * 100,
  );
  const partidosJugados = partidos.filter((p) => p.ganador !== null).length;
  const progresoTorneo =
    partidos.length > 0
      ? Math.round((partidosJugados / partidos.length) * 100)
      : 0;

  const partidosJugables = partidos.filter(
    (p) => p.equipo_a_id && p.equipo_b_id && p.ganador === null,
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-6 md:px-10 md:py-10">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/torneos")}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex flex-wrap items-center gap-3">
              {torneo.nombre}
              <span className="text-xs font-black bg-brand-chartreuse/20 text-brand-chartreuse px-3 py-1 rounded-full uppercase tracking-wider">
                {torneo.estado || "Borrador"}
              </span>
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base font-medium">
              {torneo.nivel} · {torneo.categoria} · {torneo.modalidad}
            </p>
          </div>
        </div>

        {partidos.length === 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {inscripciones.length % 2 !== 0 && (
              <span className="text-xs text-red-500 font-extrabold bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl text-center sm:text-left">
                Se requiere una cantidad par de participantes confirmados para
                generar el fixture.
              </span>
            )}
            {inscripciones.length % 2 === 0 &&
              inscripciones.some((ins) => ins.estado_pago !== "Confirmado") && (
                <span className="text-xs text-yellow-500 font-extrabold bg-yellow-500/10 border border-yellow-500/20 px-3.5 py-2.5 rounded-xl text-center sm:text-left">
                  Todos los inscritos deben estar aprobados/confirmados para
                  generar el fixture.
                </span>
              )}
            <button
              onClick={handleGenerarCuadro}
              disabled={
                inscripciones.length % 2 !== 0 ||
                inscripciones.some((ins) => ins.estado_pago !== "Confirmado")
              }
              className="flex justify-center items-center gap-2 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-black px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trophy className="size-4" /> Generar Fixture
            </button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="border-b border-white/10">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? "border-brand-chartreuse text-brand-chartreuse" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="pt-4">
        {/* RESUMEN */}
        {activeTab === "resumen" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <TrendingUp className="size-8 text-brand-chartreuse mb-4" />
              <div className="text-4xl font-black text-white mb-2">
                ${totalRecaudado.toLocaleString("es-AR")}
              </div>
              <div className="text-sm font-medium text-gray-400">
                Total Recaudado (Aprobado)
              </div>
            </div>
            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <Users className="size-8 text-blue-500 mb-4" />
              <div className="text-4xl font-black text-white mb-2">
                {porcentajeOcupacion}%
              </div>
              <div className="text-sm font-medium text-gray-400">
                Ocupación ({inscripciones.length} de {torneo.cupos_maximos})
              </div>
            </div>
            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <Activity className="size-8 text-purple-500 mb-4" />
              <div className="text-4xl font-black text-white mb-2">
                {progresoTorneo}%
              </div>
              <div className="text-sm font-medium text-gray-400">
                Progreso ({partidosJugados} de {partidos.length} partidos)
              </div>
            </div>
          </div>
        )}

        {/* 2. PESTAÑA INSCRITOS CORREGIDA (Con Empty State Hermoso) */}
        {activeTab === "inscritos" && (
          <div className="bg-[#111111] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-black/20">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#00ff88]" />
                Inscripciones ({confirmadasCount} confirmadas de{" "}
                {torneo.cupos_maximos || 16})
              </h3>
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={handleDescargarPlantilla}
                  className="flex-1 lg:flex-none justify-center flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/10 cursor-pointer"
                  title="Descargar plantilla CSV para carga masiva"
                >
                  <Download className="size-3.5" /> Descargar Plantilla
                </button>

                <div className="relative flex-1 lg:flex-none">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleSubirCSV}
                    disabled={importingCSV}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    disabled={importingCSV}
                    className="w-full flex justify-center items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/10 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="size-3.5" />{" "}
                    {importingCSV ? "Importando..." : "Subir CSV"}
                  </button>
                </div>

                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="w-full lg:w-auto flex justify-center items-center gap-1.5 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-black px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Inscribir{" "}
                  {torneo.modalidad === "Individual" ? "Jugador" : "Pareja"}
                </button>
              </div>
            </div>
            {inscripciones.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Users className="size-12 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Aún no hay inscritos
                </h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  No existen jugadores o duplas registradas para esta
                  competencia.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-8 py-5 w-16 text-center">Pago</th>
                        <th className="px-8 py-5">Código Ref.</th>
                        <th className="px-6 py-5">Participante / Dupla</th>
                        <th className="px-6 py-5 text-center">Estado Pago</th>
                        <th className="px-8 py-5 text-right">Monto</th>
                        <th className="px-8 py-5 text-center w-20">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {inscripciones.map((ins) => {
                        const isConfirmed = ins.estado_pago === "Confirmado";
                        return (
                          <tr
                            key={ins.id}
                            className={`transition-colors ${isConfirmed ? "hover:bg-green-500/5 bg-green-500/2" : "hover:bg-white/5"}`}
                          >
                            <td className="px-8 py-5 text-center">
                              <input
                                type="checkbox"
                                checked={isConfirmed}
                                disabled={isConfirmed}
                                onChange={() => {
                                  if (!isConfirmed) {
                                    setPagoModal({
                                      isOpen: true,
                                      inscripcionId: String(ins.id),
                                      montoDefecto: Number(
                                        ins.monto ||
                                          torneo.precio_inscripcion ||
                                          0,
                                      ),
                                      isLoading: false,
                                    });
                                  }
                                }}
                                className="size-4 rounded border-white/10 text-brand-chartreuse focus:ring-brand-chartreuse cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-8 py-5 font-mono text-gray-500 text-sm">
                              {String(ins.id).slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-6 py-5">
                              <div className="font-bold text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-chartreuse/10 flex items-center justify-center shrink-0">
                                  <User className="size-4 text-brand-chartreuse" />
                                </div>
                                <div>
                                  {cleanName(ins.jugador1_nombre)}
                                  {ins.jugador2_nombre &&
                                    ins.jugador2_nombre !== "-" && (
                                      <span className="text-gray-400 font-medium">
                                        {" "}
                                        / {cleanName(ins.jugador2_nombre)}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${isConfirmed ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}
                              >
                                {ins.estado_pago || "Pendiente"}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right text-brand-white font-semibold text-sm">
                              ${Number(ins.monto || 0).toLocaleString("es-AR")}
                            </td>
                            <td className="px-8 py-5 text-center">
                              <button
                                onClick={() => handleEliminarInscripcion(ins.id)}
                                className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar Inscripción"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-white/5">
                  {inscripciones.map((ins) => {
                    const isConfirmed = ins.estado_pago === "Confirmado";
                    return (
                      <div
                        key={ins.id}
                        className={`p-4 transition-colors flex flex-col gap-3 ${isConfirmed ? "bg-green-500/2" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-gray-500 text-xs">
                            REF: {String(ins.id).slice(0, 8).toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isConfirmed ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}
                            >
                              {ins.estado_pago || "Pendiente"}
                            </span>
                            <button
                              onClick={() => handleEliminarInscripcion(ins.id)}
                              className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Inscripción"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isConfirmed}
                              disabled={isConfirmed}
                              onChange={() => {
                                if (!isConfirmed) {
                                  setPagoModal({
                                    isOpen: true,
                                    inscripcionId: String(ins.id),
                                    montoDefecto: Number(
                                      ins.monto ||
                                        torneo.precio_inscripcion ||
                                        0,
                                    ),
                                    isLoading: false,
                                  });
                                }
                              }}
                              className="size-5 rounded border-white/10 text-brand-chartreuse focus:ring-brand-chartreuse cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm flex flex-wrap items-center gap-1.5">
                              <span>{cleanName(ins.jugador1_nombre)}</span>
                              {ins.jugador2_nombre &&
                                ins.jugador2_nombre !== "-" && (
                                  <span className="text-gray-400 font-medium">
                                    / {cleanName(ins.jugador2_nombre)}
                                  </span>
                                )}
                            </div>
                          </div>
                          <div className="text-right text-brand-white font-semibold text-sm shrink-0">
                            ${Number(ins.monto || 0).toLocaleString("es-AR")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* CUADROS */}
        {activeTab === "cuadros" && (
          <BracketEditor
            torneoId={id}
            torneo={torneo}
            partidos={partidos}
            inscripciones={inscripciones}
            onRefresh={() => setRefreshKey((prev) => prev + 1)}
          />
        )}

        {/* ARBITRAJE EN VIVO */}
        {activeTab === "resultados" && (
          <div className="space-y-4">
            <div className="bg-brand-card rounded-3xl border border-white/5 p-6 shadow-xl">
              <h3 className="font-extrabold text-white text-xl mb-2">
                Consola de Arbitraje en Vivo
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Suma los puntos de cada Partido. El sistema llevará la cuenta y
                cuando finalices el partido, avanzará la llave.
              </p>
              {partidosJugables.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl text-gray-500">
                  No hay partidos listos para arbitrar en este momento.
                </div>
              ) : (
                <div className="space-y-6">
                  {partidosJugables.map((partido) => (
                    <LiveArbitrajeRow
                      key={partido.id}
                      partido={partido}
                      onSave={handleGuardarResultadoLive}
                      isSaving={guardandoPartidoId === partido.id}
                      onError={showErrorModal}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FeedbackModal {...feedbackModal} />

      <ConfirmarPagoModal
        isOpen={pagoModal.isOpen}
        montoSugerido={pagoModal.montoDefecto}
        isLoading={pagoModal.isLoading}
        onClose={() => setPagoModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async (monto: number, metodo: string) => {
          setPagoModal((prev) => ({ ...prev, isLoading: true }));
          try {
            await PagosService.confirmarPagoManual({
              entidad_tipo: "inscripcion",
              entidad_id: pagoModal.inscripcionId,
              monto: monto,
              metodo_pago: metodo || "Efectivo",
            });
            setPagoModal((prev) => ({ ...prev, isOpen: false }));
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "Pago Confirmado",
              description: `El pago ha sido registrado y la inscripción está confirmada.`,
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
            setRefreshKey((prev) => prev + 1);
          } catch (error: any) {
            setPagoModal((prev) => ({
              ...prev,
              isLoading: false,
              isOpen: false,
            }));
            setFeedbackModal({
              isOpen: true,
              type: "error",
              title: "Error al procesar pago",
              description:
                error.response?.data?.error ||
                error.message ||
                "Error al registrar el pago manual.",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          }
        }}
      />

      {isManualModalOpen && torneo && (
        <InscripcionManualModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
          torneo={torneo}
        />
      )}
    </div>
  );
}
