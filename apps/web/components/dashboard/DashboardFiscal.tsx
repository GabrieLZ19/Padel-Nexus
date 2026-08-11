"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy,
  Shield,
  ClipboardList,
  Users,
  ArrowRight,
  MapPin,
  Calendar,
  Activity,
} from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import {
  FiscalPanelService,
  nombreSedeFiscal,
  type FiscalTorneo,
} from "@/utils/services/fiscal-panel";
import { FAP_ESTADOS_TORNEO } from "@/utils/constants/fap";
import { formatFechaCalendario } from "@/utils/formatFecha";

export default function DashboardFiscal() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const [torneos, setTorneos] = useState<FiscalTorneo[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dateString = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);

  useEffect(() => {
    let mounted = true;
    const defer = setTimeout(() => {
      FiscalPanelService.getTorneos()
        .then((data) => {
          if (mounted) setTorneos(data);
        })
        .catch(() => {
          if (mounted) setTorneos([]);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(defer);
    };
  }, []);

  const enCurso = torneos.filter(
    (t) => (t.estado || "").toLowerCase() === FAP_ESTADOS_TORNEO.EN_CURSO.toLowerCase(),
  );
  const enInscripcion = torneos.filter(
    (t) => (t.estado || "").toLowerCase() === FAP_ESTADOS_TORNEO.INSCRIPCION.toLowerCase(),
  );

  const proximos = useMemo(() => {
    return [...torneos]
      .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")))
      .slice(0, 4);
  }, [torneos]);

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10 animate-pulse">
        <div className="h-10 w-64 bg-white/10 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[#151515] border border-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-brand-chartreuse text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Shield className="size-4" /> Resumen operativo
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
            Hola, {profile?.nombre || "fiscal"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {profile?.fiscal_rango ? `Alcance ${profile.fiscal_rango} · ` : ""}
            {dateString.charAt(0).toUpperCase() + dateString.slice(1)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/fiscal/torneos")}
          className="flex items-center justify-center gap-2 bg-brand-chartreuse text-brand-black font-bold px-5 py-3 rounded-xl text-sm cursor-pointer"
        >
          Ir a mis torneos <ArrowRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={Trophy} label="Asignados" value={String(torneos.length)} />
        <Kpi icon={Activity} label="En curso" value={String(enCurso.length)} />
        <Kpi
          icon={ClipboardList}
          label="En inscripción"
          value={String(enInscripcion.length)}
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">Próximos a atender</h2>
          <button
            type="button"
            onClick={() => router.push("/dashboard/fiscal/torneos")}
            className="text-xs font-bold text-brand-chartreuse hover:underline cursor-pointer"
          >
            Ver listado completo
          </button>
        </div>

        {proximos.length === 0 ? (
          <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
            Todavía no tenés torneos asignados. El Colegio de Fiscales hace la
            asignación.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {proximos.map((t, index) => (
              <motion.button
                key={t.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/dashboard/fiscal/torneos/${t.id}`)}
                className="text-left bg-[#151515] border border-white/5 hover:border-brand-chartreuse/30 rounded-2xl p-5 transition-colors cursor-pointer"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                  {t.alcance || "Local"} · {t.estado}
                </p>
                <h3 className="text-base font-extrabold text-white">{t.nombre}</h3>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {formatFechaCalendario(t.fecha)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {nombreSedeFiscal(t)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {t.modalidad || "Duplas"}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#151515] border border-white/5 rounded-2xl p-5">
      <div className="size-10 bg-[#2a3614] rounded-xl flex items-center justify-center mb-4">
        <Icon className="size-5 text-brand-chartreuse" />
      </div>
      <p className="text-3xl font-extrabold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  );
}
