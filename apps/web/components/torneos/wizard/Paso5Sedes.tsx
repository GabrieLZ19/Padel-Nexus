import { SedesFiscalesTab } from "@/components/torneos/SedesFiscalesTab";

interface Paso7SedesProps {
  torneoId: string;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  readOnly?: boolean;
}

export const Paso7Sedes = ({
  torneoId,
  setActiveTab,
  triggerRefresh,
  readOnly = false,
}: Paso7SedesProps) => {
  return (
    <div className="space-y-6">
      <SedesFiscalesTab torneoId={torneoId} onRefresh={triggerRefresh} />

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("players")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <button
          onClick={() => setActiveTab("fiscales")}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Siguiente Paso: Fiscales
        </button>
      </div>
    </div>
  );
};
