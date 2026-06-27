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
} from "lucide-react";
import { TorneosService } from "../../../../utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "../../../../utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "../../../../components/ui/FeedbackModal";
import { MatchCard } from "@/components/torneos/MatchCard";
import { LiveArbitrajeRow } from "@/components/torneos/LiveArbitrajeRow";
import { BracketEditor } from "@/components/torneos/BracketEditor";

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "inscritos", label: "Inscritos Aprobados", icon: Users },
  { id: "cuadros", label: "Cuadros y Llaves", icon: GitMerge },
  { id: "resultados", label: "Arbitraje en Vivo", icon: Trophy },
];

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
        if (isMounted) setLoading(true);
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
          const confirmados = (dataInscripciones as Inscripcion[]).filter(
            (i) => i.estado_pago === "Confirmado",
          );
          setInscripciones(confirmados);
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
  const totalRecaudado = inscripciones.reduce(
    (acc, curr) => acc + Number(curr.monto || 0),
    0,
  );
  const porcentajeOcupacion = Math.round(
    (inscripciones.length / (torneo.cupos_maximos || 1)) * 100,
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/torneos")}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              {torneo.nombre}
              <span className="text-xs font-black bg-brand-chartreuse/20 text-brand-chartreuse px-3 py-1 rounded-full uppercase tracking-wider">
                {torneo.estado || "Borrador"}
              </span>
            </h1>
            <p className="text-gray-400 mt-1 font-medium">
              {torneo.nivel} · {torneo.categoria} · {torneo.modalidad}
            </p>
          </div>
        </div>
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
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#00ff88]" />
                Inscripciones Confirmadas ({inscripciones.length} /{" "}
                {torneo.cupos_maximos || 16})
              </h3>
            </div>
            {inscripciones.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Users className="size-12 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Aún no hay inscritos
                </h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  No existen jugadores o duplas con estado de pago confirmado
                  para esta competencia.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-8 py-5">Código Ref.</th>
                      <th className="px-6 py-5">Participante / Dupla</th>
                      <th className="px-8 py-5 text-right">
                        Fecha Confirmación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inscripciones.map((ins) => (
                      <tr
                        key={ins.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-8 py-5 font-mono text-gray-500 text-sm">
                          {String(ins.id).slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-chartreuse/10 flex items-center justify-center shrink-0">
                              <User className="size-4 text-brand-chartreuse" />
                            </div>
                            <div>
                              {ins.jugador1_nombre || "Desconocido"}
                              {ins.jugador2_nombre &&
                                ins.jugador2_nombre !== "-" && (
                                  <span className="text-gray-400 font-medium">
                                    {" "}
                                    / {ins.jugador2_nombre}
                                  </span>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right text-gray-400 text-sm">
                          {ins.created_at ? new Date(ins.created_at).toLocaleDateString("es-AR") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CUADROS */}
        {activeTab === "cuadros" && (
          <BracketEditor torneoId={id} torneo={torneo} partidos={partidos} />
        )}

        {/* ARBITRAJE EN VIVO */}
        {activeTab === "resultados" && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-3xl border border-white/5 p-6">
              <h3 className="font-bold text-xl mb-2">
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
    </div>
  );
}
