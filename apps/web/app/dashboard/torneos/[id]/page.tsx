"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  GitMerge,
  Trophy,
  LayoutDashboard,
  CheckCircle2,
  User,
  Loader2,
  TrendingUp,
  Activity,
  Save,
} from "lucide-react";
import { TorneosService } from "../../../../utils/services/torneos";
import { Torneo, Inscripcion } from "../../../../utils/types";

// Interfaces Estrictas
interface PerfilSimple {
  nombre_completo: string;
}

interface EquipoInscripcion {
  id: string;
  jugador2_nombre: string | null;
  perfiles: PerfilSimple | null;
}

interface PartidoPopulated {
  id: string;
  torneo_id: string;
  ronda: string;
  orden: number;
  estado_partido: string;
  set1_a: number | null;
  set1_b: number | null;
  ganador: string | null;
  equipo_a: EquipoInscripcion | null;
  equipo_b: EquipoInscripcion | null;
}

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "inscritos", label: "Inscritos Aprobados", icon: Users },
  { id: "cuadros", label: "Cuadros y Llaves", icon: GitMerge },
  { id: "resultados", label: "Carga de Resultados", icon: Trophy },
];

export default function TorneoDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [partidos, setPartidos] = useState<PartidoPopulated[]>([]);

  const [activeTab, setActiveTab] = useState<string>("resumen");
  const [loading, setLoading] = useState<boolean>(true);
  const [generando, setGenerando] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Estado para manejar los inputs de los sets en la tabla de resultados
  const [resultadosEdit, setResultadosEdit] = useState<
    Record<string, { set1_a: number | ""; set1_b: number | "" }>
  >({});
  const [guardandoPartidoId, setGuardandoPartidoId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const fetchTorneoData = async () => {
      try {
        if (isMounted) setLoading(true);

        const [dataTorneo, dataInscripciones, dataPartidos] = await Promise.all(
          [
            TorneosService.getById(id),
            TorneosService.getInscripcionesConfirmadas(id).catch(() => []),
            TorneosService.getPartidos(id).catch(() => []),
          ],
        );

        if (isMounted) {
          setTorneo(dataTorneo);
          const inscripcionesConfirmadas = (
            dataInscripciones as Inscripcion[]
          ).filter((i: Inscripcion) => i.estado_pago === "Confirmado");
          setInscripciones(inscripcionesConfirmadas);
          setPartidos(dataPartidos as unknown as PartidoPopulated[]);

          // Inicializamos los inputs de resultados con valores vacíos para los partidos pendientes
          const initialEditState: Record<
            string,
            { set1_a: number | ""; set1_b: number | "" }
          > = {};
          (dataPartidos as unknown as PartidoPopulated[]).forEach((p) => {
            if (p.estado_partido !== "Finalizado") {
              initialEditState[p.id] = { set1_a: "", set1_b: "" };
            }
          });
          setResultadosEdit(initialEditState);
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
      alert(
        "Se necesitan al menos 4 inscripciones confirmadas para poder armar las llaves.",
      );
      return;
    }

    if (
      window.confirm(
        "¿Estás seguro? Esto creará los cruces de partidos automáticamente. Si ya existe un fixture configurado, se sobrescribirá por completo.",
      )
    ) {
      try {
        setGenerando(true);
        await TorneosService.generarCuadro(id);
        setRefreshKey((prev) => prev + 1);
        alert("¡Cuadro generado exitosamente!");
        setActiveTab("cuadros");
      } catch (error: unknown) {
        let errorMsg = "No se pudo procesar la solicitud.";
        if (error instanceof Error) errorMsg = error.message;
        alert("Error al generar el cuadro: " + errorMsg);
      } finally {
        setGenerando(false);
      }
    }
  };

  const handleGuardarResultado = async (partido: PartidoPopulated) => {
    const form = resultadosEdit[partido.id];
    if (!form || form.set1_a === "" || form.set1_b === "") {
      alert("Debes completar los games ganados por ambos equipos.");
      return;
    }

    if (form.set1_a === form.set1_b) {
      alert("En el pádel no puede haber empates en un set definido.");
      return;
    }

    if (!partido.equipo_a || !partido.equipo_b) {
      alert(
        "No puedes cargar resultado de un partido sin rivales confirmados.",
      );
      return;
    }

    const ganador_id =
      form.set1_a > form.set1_b ? partido.equipo_a.id : partido.equipo_b.id;

    try {
      setGuardandoPartidoId(partido.id);
      await TorneosService.actualizarResultado(partido.id, {
        ganador_id,
        set1_a: Number(form.set1_a),
        set1_b: Number(form.set1_b),
      });
      alert("¡Resultado cargado! El ganador ha avanzado de ronda.");
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      let errorMsg = "Ocurrió un error al guardar el resultado.";
      if (error instanceof Error) errorMsg = error.message;
      alert(errorMsg);
    } finally {
      setGuardandoPartidoId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-white">
        <Loader2 className="size-8 animate-spin text-padel-4 mr-3" />
        <span className="font-medium">Cargando centro de control...</span>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="p-10 text-white text-center font-bold">
        Torneo no encontrado o ID inválido.
      </div>
    );
  }

  const esDupla = torneo.modalidad !== "Individual";

  // KPIs para la pestaña Resumen
  const totalRecaudado = inscripciones.reduce(
    (acc, curr) => acc + Number(curr.monto || 0),
    0,
  );
  const porcentajeOcupacion = Math.round(
    (inscripciones.length / (torneo.cupos_maximos || 1)) * 100,
  );
  const partidosJugados = partidos.filter(
    (p) => p.estado_partido === "Finalizado",
  ).length;
  const progresoTorneo =
    partidos.length > 0
      ? Math.round((partidosJugados / partidos.length) * 100)
      : 0;

  // Filtrado de Partidos
  const partidosJugables = partidos.filter(
    (p) => p.equipo_a && p.equipo_b && p.estado_partido !== "Finalizado",
  );
  const partidosFinalizados = partidos.filter(
    (p) => p.estado_partido === "Finalizado",
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
              <span className="text-xs font-black bg-padel-4/20 text-padel-4 px-3 py-1 rounded-full uppercase tracking-wider">
                {torneo.estado || "Borrador"}
              </span>
            </h1>
            <p className="text-gray-400 mt-1 font-medium">
              {torneo.nivel} · {torneo.categoria} · {torneo.modalidad}
            </p>
          </div>
        </div>
      </div>

      {/* SISTEMA DE PESTAÑAS (TABS) */}
      <div className="border-b border-white/10">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-padel-4 text-padel-4"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
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
        {/* PESTAÑA: RESUMEN */}
        {activeTab === "resumen" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-padel-4/10 rounded-full blur-3xl"></div>
              <TrendingUp className="size-8 text-padel-4 mb-4" />
              <div className="text-4xl font-black text-white leading-none mb-2">
                ${totalRecaudado.toLocaleString("es-AR")}
              </div>
              <div className="text-sm font-medium text-gray-400">
                Total Recaudado (Aprobado)
              </div>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              <Users className="size-8 text-blue-500 mb-4" />
              <div className="text-4xl font-black text-white leading-none mb-2">
                {porcentajeOcupacion}%
              </div>
              <div className="text-sm font-medium text-gray-400">
                Ocupación de Cupos ({inscripciones.length} de{" "}
                {torneo.cupos_maximos})
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(porcentajeOcupacion, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
              <Activity className="size-8 text-purple-500 mb-4" />
              <div className="text-4xl font-black text-white leading-none mb-2">
                {progresoTorneo}%
              </div>
              <div className="text-sm font-medium text-gray-400">
                Progreso del Torneo ({partidosJugados} de {partidos.length}{" "}
                partidos)
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${progresoTorneo}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: INSCRITOS */}
        {activeTab === "inscritos" && (
          <div className="bg-[#111111] rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#00ff88]" />
                Inscripciones Confirmadas ({inscripciones.length} /{" "}
                {torneo.cupos_maximos || 16})
              </h3>
            </div>
            {inscripciones.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                Aún no existen duplas o jugadores con estado de pago confirmado
                para esta competencia.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-6 py-4">Código Ref.</th>
                      <th className="px-6 py-4">Participante / Dupla</th>
                      <th className="px-6 py-4 text-right">
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
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                          {String(ins.id).slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            {esDupla ? (
                              <Users className="size-4 text-padel-4" />
                            ) : (
                              <User className="size-4 text-padel-4" />
                            )}
                            {ins.jugador1_nombre}{" "}
                            {esDupla && ins.jugador2_nombre
                              ? `/ ${ins.jugador2_nombre}`
                              : ""}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-400">
                          {new Date(ins.created_at).toLocaleDateString("es-AR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: CUADROS Y LLAVES */}
        {activeTab === "cuadros" && (
          <div>
            {partidos.length === 0 ? (
              <div className="bg-[#111111] border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center min-h-100">
                <GitMerge className="size-16 text-gray-600 mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Generador de Cuadros
                </h2>
                <p className="text-gray-400 max-w-md mb-8">
                  Actualmente dispones de{" "}
                  <strong>{inscripciones.length}</strong> duplas confirmadas. El
                  sistema requiere un mínimo de 4 para estructurar un árbol de
                  llaves.
                </p>
                <button
                  onClick={handleGenerarCuadro}
                  disabled={generando || inscripciones.length < 4}
                  className="bg-padel-4 text-[#111] disabled:opacity-40 hover:bg-[#b3e600] px-8 py-3 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] flex items-center gap-2"
                >
                  {generando ? (
                    <>
                      <Loader2 className="size-5 animate-spin" /> Procesando
                      llaves...
                    </>
                  ) : (
                    "Generar Cuadro Automático"
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-[#111111] border border-white/5 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <h3 className="font-bold text-xl text-white">
                    Fixture del Torneo
                  </h3>
                  <button
                    onClick={handleGenerarCuadro}
                    disabled={generando || partidosJugados > 0}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold underline transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      partidosJugados > 0
                        ? "No puedes regenerar si ya hay partidos jugados"
                        : ""
                    }
                  >
                    Regenerar Cruces (Borrará el fixture actual)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {partidos.map((partido, idx) => {
                    const nombreA = partido.equipo_a
                      ? `${partido.equipo_a.perfiles?.nombre_completo || "Desconocido"} ${partido.equipo_a.jugador2_nombre ? `/ ${partido.equipo_a.jugador2_nombre}` : ""}`
                      : "Esperando rival...";

                    const nombreB = partido.equipo_b
                      ? `${partido.equipo_b.perfiles?.nombre_completo || "Desconocido"} ${partido.equipo_b.jugador2_nombre ? `/ ${partido.equipo_b.jugador2_nombre}` : ""}`
                      : "Esperando rival...";

                    return (
                      <div
                        key={partido.id || idx}
                        className="bg-black/30 border border-white/5 p-5 rounded-2xl space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-[11px] text-padel-4 font-black uppercase tracking-widest bg-padel-4/5 px-2.5 py-1 rounded-md inline-block">
                            {partido.ronda} · Partido {partido.orden}
                          </div>
                          {partido.estado_partido === "Finalizado" && (
                            <CheckCircle2 className="size-4 text-[#00ff88]" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div
                            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${partido.equipo_a ? "bg-white/5 text-white border border-white/5" : "bg-white/2 text-gray-600 border border-dashed border-white/5"}`}
                          >
                            {nombreA}{" "}
                            {partido.estado_partido === "Finalizado" &&
                              partido.ganador === partido.equipo_a?.id &&
                              "🏆"}
                          </div>
                          <div className="text-center text-gray-700 text-[10px] font-black tracking-widest uppercase">
                            {partido.estado_partido === "Finalizado"
                              ? `${partido.set1_a} - ${partido.set1_b}`
                              : "VS"}
                          </div>
                          <div
                            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${partido.equipo_b ? "bg-white/5 text-white border border-white/5" : "bg-white/2 text-gray-600 border border-dashed border-white/5"}`}
                          >
                            {nombreB}{" "}
                            {partido.estado_partido === "Finalizado" &&
                              partido.ganador === partido.equipo_b?.id &&
                              "🏆"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: RESULTADOS */}
        {activeTab === "resultados" && (
          <div className="space-y-8">
            <div className="bg-[#111111] rounded-3xl border border-white/5 p-6">
              <h3 className="font-bold text-xl text-white mb-2">
                Planilla de Arbitraje
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Ingresa los juegos ganados por cada equipo. El sistema avanzará
                automáticamente al ganador a la siguiente ronda.
              </p>

              {partidosJugables.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl text-gray-500">
                  No hay partidos listos para cargar resultados en este momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {partidosJugables.map((partido) => {
                    const nombreA = partido.equipo_a
                      ? `${partido.equipo_a.perfiles?.nombre_completo || "Desconocido"} ${partido.equipo_a.jugador2_nombre ? `/ ${partido.equipo_a.jugador2_nombre}` : ""}`
                      : "Equipo A";

                    const nombreB = partido.equipo_b
                      ? `${partido.equipo_b.perfiles?.nombre_completo || "Desconocido"} ${partido.equipo_b.jugador2_nombre ? `/ ${partido.equipo_b.jugador2_nombre}` : ""}`
                      : "Equipo B";

                    return (
                      <div
                        key={partido.id}
                        className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6"
                      >
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest w-24 shrink-0 text-center md:text-left">
                          {partido.ronda}
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row items-center gap-4 w-full">
                          <div className="flex-1 text-sm font-bold text-white text-right w-full">
                            {nombreA}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max="7"
                              className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg text-center text-lg font-black text-white focus:outline-none focus:border-padel-4 transition-colors"
                              value={resultadosEdit[partido.id]?.set1_a ?? ""}
                              onChange={(e) =>
                                setResultadosEdit((prev) => ({
                                  ...prev,
                                  [partido.id]: {
                                    ...prev[partido.id],
                                    set1_a:
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value),
                                  },
                                }))
                              }
                            />
                            <span className="text-gray-600 font-bold">-</span>
                            <input
                              type="number"
                              min="0"
                              max="7"
                              className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg text-center text-lg font-black text-white focus:outline-none focus:border-padel-4 transition-colors"
                              value={resultadosEdit[partido.id]?.set1_b ?? ""}
                              onChange={(e) =>
                                setResultadosEdit((prev) => ({
                                  ...prev,
                                  [partido.id]: {
                                    ...prev[partido.id],
                                    set1_b:
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value),
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="flex-1 text-sm font-bold text-white text-left w-full">
                            {nombreB}
                          </div>
                        </div>

                        <button
                          onClick={() => handleGuardarResultado(partido)}
                          disabled={guardandoPartidoId === partido.id}
                          className="shrink-0 bg-padel-4/10 hover:bg-padel-4/20 text-padel-4 border border-padel-4/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
                        >
                          {guardandoPartidoId === partido.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Save className="size-4" />
                          )}
                          Guardar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {partidosFinalizados.length > 0 && (
              <div className="bg-[#111111] rounded-3xl border border-white/5 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-[#00ff88]" />
                  Resultados Finalizados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {partidosFinalizados.map((partido) => {
                    const nombreA =
                      partido.equipo_a?.perfiles?.nombre_completo || "Equipo A";
                    const nombreB =
                      partido.equipo_b?.perfiles?.nombre_completo || "Equipo B";
                    return (
                      <div
                        key={partido.id}
                        className="bg-white/5 rounded-lg p-3 flex justify-between items-center border border-white/5"
                      >
                        <div className="text-xs font-medium text-gray-400 truncate max-w-[40%]">
                          {partido.ganador === partido.equipo_a?.id ? (
                            <span className="text-white font-bold">
                              {nombreA} 🏆
                            </span>
                          ) : (
                            nombreA
                          )}
                        </div>
                        <div className="text-sm font-black text-padel-4 px-2 tracking-widest bg-black/40 rounded">
                          {partido.set1_a} - {partido.set1_b}
                        </div>
                        <div className="text-xs font-medium text-gray-400 truncate max-w-[40%] text-right">
                          {partido.ganador === partido.equipo_b?.id ? (
                            <span className="text-white font-bold">
                              🏆 {nombreB}
                            </span>
                          ) : (
                            nombreB
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
