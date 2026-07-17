import { Trophy } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Partido } from "@/utils/types";

interface Paso9PublicarProps {
  torneo: Torneo;
  torneoId: string;
  partidos: Partido[];
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
}

export const Paso9Publicar = ({
  torneo,
  torneoId,
  partidos,
  setActiveTab,
  triggerRefresh,
}: Paso9PublicarProps) => {
  const partidosJugados = partidos.filter((p) => p.ganador !== null).length;

  const handleFinalizar = async () => {
    try {
      await TorneosService.update(torneoId, { estado: "finalizado" } as any);
      triggerRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-2xl">
        <Trophy className="size-16 text-brand-chartreuse mx-auto" />
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-wider">
            Paso 9: Control de Estado del Torneo
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            Una vez que todos los partidos y llaves han finalizado, podés
            publicar los resultados finales y cerrar formalmente la competencia.
          </p>
        </div>

        <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4 text-left">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 font-bold">Estado actual</span>
            <span className="font-extrabold text-brand-chartreuse uppercase tracking-wider">
              {torneo.estado}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 font-bold">Partidos Jugados</span>
            <span className="font-extrabold text-white">
              {partidosJugados} de {partidos.length}
            </span>
          </div>
        </div>

        <div className="flex gap-4 justify-center pt-4">
          <button
            onClick={handleFinalizar}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Finalizar Torneo
          </button>
        </div>
      </div>

      <div className="flex justify-start pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("matches")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
      </div>
    </div>
  );
};
