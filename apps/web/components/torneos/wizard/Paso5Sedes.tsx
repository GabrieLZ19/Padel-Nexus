import { SedesFiscalesTab } from "@/components/torneos/SedesFiscalesTab";

interface Paso7SedesProps {
  torneoId: string;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  readOnly?: boolean;
  /** Paso que sigue a Sedes. El club no tiene Fiscales y pasa directo a Cierre. */
  siguienteId?: string;
  siguienteLabel?: string;
}

export const Paso7Sedes = ({
  torneoId,
  setActiveTab,
  triggerRefresh,
  readOnly = false,
  siguienteId = "fiscales",
  siguienteLabel = "Fiscales",
}: Paso7SedesProps) => {
  return (
    <div className="space-y-6">
      <SedesFiscalesTab
        torneoId={torneoId}
        onRefresh={triggerRefresh}
        readOnly={readOnly}
      />

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("players")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <button
          onClick={() => setActiveTab(siguienteId)}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Siguiente Paso: {siguienteLabel}
        </button>
      </div>
    </div>
  );
};
