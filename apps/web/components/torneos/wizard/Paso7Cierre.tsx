import { useState, useEffect, useRef } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Inscripcion } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { Trophy, Settings, Award, CheckCircle, Scale } from "lucide-react";
import type { RegisterSaveHandler } from "./types";

interface Paso5CierreProps {
  torneo: Torneo;
  torneoId: string;
  inscripciones: Inscripcion[];
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  registerSaveHandler?: RegisterSaveHandler;
}

export const Paso5Cierre = ({
  torneo,
  torneoId,
  inscripciones,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  registerSaveHandler,
}: Paso5CierreProps) => {
  const confirmadasCount = inscripciones.filter(
    (i) => i.estado_pago === "Confirmado",
  ).length;
  const estadoNorm = (torneo.estado || "").toLowerCase();
  const isOpenState =
    estadoNorm === "inscripción" ||
    estadoNorm === "inscripcion" ||
    estadoNorm === "borrador" ||
    estadoNorm === "habilitado";

  // Parsear puntos iniciales
  const rawPuntos = (torneo as any).configuracion_puntos || {};
  const [puntosActivados, setPuntosActivados] = useState(
    rawPuntos.puntos_activados || false
  );
  const [puntosCampeon, setPuntosCampeon] = useState(
    rawPuntos.puntos_campeon ?? 1000
  );
  const [puntosFinal, setPuntosFinal] = useState(
    rawPuntos.puntos_final ?? 600
  );
  const [puntosSemis, setPuntosSemis] = useState(
    rawPuntos.puntos_semis ?? 360
  );
  const [puntosCuartos, setPuntosCuartos] = useState(
    rawPuntos.puntos_cuartos ?? 180
  );
  const [puntosOctavos, setPuntosOctavos] = useState(
    rawPuntos.puntos_octavos ?? 90
  );
  const [puntos16avos, setPuntos16avos] = useState(
    rawPuntos.puntos_16avos ?? 45
  );
  const [puntos32avos, setPuntos32avos] = useState(
    rawPuntos.puntos_32avos ?? 0
  );
  const [puntosZona, setPuntosZona] = useState(
    rawPuntos.puntos_zona ?? 0
  );

  // Parsear reglas iniciales
  const rawReglas = (torneo as any).reglas_arbitraje || {};
  const [puntoOro, setPuntoOro] = useState(rawReglas.punto_oro || false);
  const [starPoint, setStarPoint] = useState(rawReglas.star_point || false);
  // Solo ON si estaba guardado explícitamente (no default).
  const [ventajaSetPoint, setVentajaSetPoint] = useState(
    rawReglas.ventaja_set_point === true || rawReglas.set_point === true,
  );
  const [definicionTercerSet, setDefinicionTercerSet] = useState(
    rawReglas.definicion_tercer_set || "Completo"
  );
  const [supertiebreakPuntos, setSupertiebreakPuntos] = useState(
    rawReglas.supertiebreak_puntos ?? 10
  );
  const [supertiebreakDiferencia, setSupertiebreakDiferencia] = useState(
    rawReglas.supertiebreak_diferencia ?? true
  );
  const [instanciaLimiteStb, setInstanciaLimiteStb] = useState<string>(
    rawReglas.instancia_limite_stb || "Todo el Torneo"
  );
  
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const handleSaveConfig = async (options?: {
    silent?: boolean;
  }): Promise<boolean> => {
    try {
      setGuardandoConfig(true);
      await TorneosService.update(torneoId, {
        configuracion_puntos: {
          puntos_activados: puntosActivados,
          puntos_campeon: Number(puntosCampeon),
          puntos_final: Number(puntosFinal),
          puntos_semis: Number(puntosSemis),
          puntos_cuartos: Number(puntosCuartos),
          puntos_octavos: Number(puntosOctavos),
          puntos_16avos: Number(puntos16avos),
          puntos_32avos: Number(puntos32avos),
          puntos_zona: Number(puntosZona),
        },
        reglas_arbitraje: {
          punto_oro: puntoOro,
          star_point: starPoint,
          ventaja_set_point: !!ventajaSetPoint,
          set_point: !!ventajaSetPoint,
          definicion_tercer_set: definicionTercerSet,
          supertiebreak_puntos: Number(supertiebreakPuntos),
          supertiebreak_diferencia: supertiebreakDiferencia,
          instancia_limite_stb: instanciaLimiteStb,
        },
      } as any);
      triggerRefresh();
      if (!options?.silent) {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "success",
          title: "¡Configuración guardada!",
          description:
            "Los valores del ranking y las reglas de puntuación han sido actualizados con éxito.",
        }));
      }
      return true;
    } catch (e: any) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: e.message || "No se pudo actualizar la configuración.",
      }));
      return false;
    } finally {
      setGuardandoConfig(false);
    }
  };

  const saveRef = useRef(handleSaveConfig);
  saveRef.current = handleSaveConfig;

  useEffect(() => {
    if (!registerSaveHandler) return;
    registerSaveHandler(() => saveRef.current({ silent: true }));
    return () => registerSaveHandler(null);
  }, [registerSaveHandler]);

  return (
    <div className="bg-brand-card border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
      <h3 className="text-lg font-bold text-white uppercase tracking-wider">
        Paso 6: Cierre de Inscripción y Puntuación
      </h3>
      <p className="text-sm text-gray-400">
        Verifique el cupo de inscripciones aprobadas. Configure la asignación de puntos del ranking y el sistema de puntuación de partidos. Las inscripciones se cierran automáticamente al generar los cuadros.
      </p>

      {/* JUGADORES Y ESTADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-brand-input/40 p-6 rounded-2xl border border-white/10 shadow-sm">
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Jugadores Confirmados
          </p>
          <p className="text-2xl font-black text-white mt-1">
            {confirmadasCount} / {torneo.cupos_maximos}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Estado de Inscripciones
          </p>
          <span
            className={`inline-block px-3 py-1 font-black rounded-full text-xs mt-1 uppercase tracking-wider border ${
              isOpenState
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {isOpenState ? "Abiertas" : "Cerradas"}
          </span>
        </div>
      </div>

      {/* INFORMACIÓN SOBRE EL RANKING VINCULADO */}
      <div className="border-t border-white/10 pt-6 space-y-4">
        <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Award className="size-4 text-brand-chartreuse" /> Ranking Vinculado
        </h4>
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-brand-input/40 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-gray-500 uppercase font-black">
                <th className="p-4">Nombre del Ranking</th>
                <th className="p-4">Clase / Nivel</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Puntos Máximos (Campeón)</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold text-white">
              <tr className="border-b border-white/10 hover:bg-white/5 transition-all">
                <td className="p-4">
                  {(() => {
                    const reg = (torneo as any).reglamento || (torneo as any).asociacion || "FAP";
                    return reg === "Amateur"
                      ? "Ranking Amateur / Independiente"
                      : `${reg} ${torneo.alcance || "Provincial"} Ranking`;
                  })()}
                </td>
                <td className="p-4">{torneo.categoria || "General"} {torneo.nivel || ""}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
                    <CheckCircle className="size-3" /> Aprobado
                  </span>
                </td>
                <td className="p-4 text-right text-brand-chartreuse font-black">
                  {puntosActivados ? puntosCampeon : 0} Pts
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SISTEMA DE PUNTUACIÓN DE PARTIDOS */}
      <div className="border-t border-white/10 pt-6 space-y-6">
        <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Scale className="size-4 text-brand-chartreuse" /> Sistema de Puntuación de Partidos
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-input/40 p-5 rounded-2xl border border-white/10 shadow-sm">
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-white uppercase tracking-widest">
              Modo de puntuación
            </h5>
            <p className="text-[10px] text-gray-500 font-medium -mt-2">
              Ventaja / Set Point, Punto de Oro y Star Point son mutuamente
              excluyentes.
            </p>

            <div className="flex items-center justify-between p-3.5 bg-brand-input rounded-xl border border-white/10 shadow-xs">
              <div>
                <p className="text-xs font-extrabold text-white">
                  Ventaja / Set Point
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  Scoring tradicional con deuce y ventajas al 40-40.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !ventajaSetPoint;
                  setVentajaSetPoint(next);
                  if (next) {
                    setPuntoOro(false);
                    setStarPoint(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border ${
                  ventajaSetPoint
                    ? "bg-brand-chartreuse border-brand-chartreuse"
                    : "bg-zinc-500 border-zinc-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                    ventajaSetPoint ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-brand-input rounded-xl border border-white/10 shadow-xs">
              <div>
                <p className="text-xs font-extrabold text-white">Punto de Oro</p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  Definición directa sin ventajas al llegar a 40-40.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !puntoOro;
                  setPuntoOro(next);
                  if (next) {
                    setStarPoint(false);
                    setVentajaSetPoint(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border ${
                  puntoOro
                    ? "bg-brand-chartreuse border-brand-chartreuse"
                    : "bg-zinc-500 border-zinc-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                    puntoOro ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-brand-input rounded-xl border border-white/10 shadow-xs">
              <div>
                <p className="text-xs font-extrabold text-white">Star Point</p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  Variante alternativa al punto de oro (punto decisivo
                  especial).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !starPoint;
                  setStarPoint(next);
                  if (next) {
                    setPuntoOro(false);
                    setVentajaSetPoint(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border ${
                  starPoint
                    ? "bg-brand-chartreuse border-brand-chartreuse"
                    : "bg-zinc-500 border-zinc-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                    starPoint ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Definición del Tercer Set</h5>
            
            <div className="space-y-3">
              <CustomDropdown
                value={definicionTercerSet}
                onChange={setDefinicionTercerSet}
                options={[
                  { value: "Completo", label: "Set completo convencional" },
                  { value: "Super Tiebreak", label: "Super Tie-break" },
                ]}
                placeholder="Seleccionar Definición..."
              />

              {definicionTercerSet === "Super Tiebreak" && (
                <div className="space-y-3 pt-2 animate-fadeIn">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                      ¿Hasta qué instancia aplica el Super Tie-break?
                    </label>
                    <CustomDropdown
                      value={instanciaLimiteStb}
                      onChange={setInstanciaLimiteStb}
                      options={[
                        { value: "Todo el Torneo", label: "Todo el torneo" },
                        { value: "Fase de Grupos", label: "Solo Fase de Grupos" },
                        { value: "Hasta Octavos", label: "Hasta Octavos de Final" },
                        { value: "Hasta Cuartos", label: "Hasta Cuartos de Final" },
                        { value: "Hasta Semifinales", label: "Hasta Semifinales" },
                      ]}
                      placeholder="Seleccionar Instancia..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                        Puntos Máximos del STB
                      </label>
                      <CustomDropdown
                        value={String(supertiebreakPuntos)}
                        onChange={(val) => setSupertiebreakPuntos(Number(val))}
                        options={Array.from({ length: 11 }, (_, i) => ({
                          value: String(i + 1),
                          label: `${i + 1} ${i + 1 === 1 ? "punto" : "puntos"}`,
                        }))}
                        placeholder="Puntos..."
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Diferencia de 2</label>
                      <button
                        type="button"
                        onClick={() => setSupertiebreakDiferencia(!supertiebreakDiferencia)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${supertiebreakDiferencia ? "bg-brand-chartreuse/10 border-brand-chartreuse/30 text-brand-chartreuse" : "bg-brand-input border-white/10 text-gray-400"}`}
                      >
                        {supertiebreakDiferencia ? "Requerida" : "Sin diferencia"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURACIÓN Y ASIGNACIÓN DE PUNTOS */}
      <div className="border-t border-white/10 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="size-4 text-brand-chartreuse" /> Asignación de Puntos de Torneo
            </h4>
            <p className="text-[11px] text-gray-400 mt-1">
              Habilitá el otorgamiento de puntaje del ranking a los competidores según la ronda alcanzada.
            </p>
          </div>
          <div
            onClick={() => setPuntosActivados(!puntosActivados)}
            className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 border ${
              puntosActivados
                ? "bg-brand-chartreuse border-brand-chartreuse"
                : "bg-zinc-500 border-zinc-600"
            } relative`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                puntosActivados ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </div>
        </div>

        {puntosActivados && (
          <div className="space-y-4 bg-brand-input/40 p-5 rounded-2xl border border-white/10 animate-fadeIn shadow-sm">
            <h5 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1 border-b border-white/5 pb-2">
              <Trophy className="size-3.5 text-brand-chartreuse" /> Puntos por Instancia Alcanzada
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  Campeón
                </label>
                <input
                  type="number"
                  value={puntosCampeon}
                  onChange={(e) => setPuntosCampeon(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  Finalista
                </label>
                <input
                  type="number"
                  value={puntosFinal}
                  onChange={(e) => setPuntosFinal(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  Semifinales
                </label>
                <input
                  type="number"
                  value={puntosSemis}
                  onChange={(e) => setPuntosSemis(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  Cuartos
                </label>
                <input
                  type="number"
                  value={puntosCuartos}
                  onChange={(e) => setPuntosCuartos(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  Octavos
                </label>
                <input
                  type="number"
                  value={puntosOctavos}
                  onChange={(e) => setPuntosOctavos(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  16avos
                </label>
                <input
                  type="number"
                  value={puntos16avos}
                  onChange={(e) => setPuntos16avos(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  32avos
                </label>
                <input
                  type="number"
                  value={puntos32avos}
                  onChange={(e) => setPuntos32avos(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">
                  Fase de Zonas
                </label>
                <input
                  type="number"
                  value={puntosZona}
                  onChange={(e) => setPuntosZona(Number(e.target.value))}
                  className="w-full bg-brand-input border border-white/10 text-white p-2.5 rounded-lg text-xs font-bold focus:border-brand-chartreuse/50 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => void handleSaveConfig()}
            disabled={guardandoConfig}
            className="bg-brand-chartreuse text-brand-black px-6 py-2.5 rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            {guardandoConfig ? "Guardando..." : "Guardar Configuración General"}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <button
          onClick={() => void setActiveTab("fiscales")}
          disabled={guardandoConfig}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
        >
          Atrás
        </button>
        <button
          onClick={() => void setActiveTab("draws")}
          disabled={guardandoConfig}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-40"
        >
          Siguiente Paso: Cuadros & Llaves
        </button>
      </div>
    </div>
  );
};
