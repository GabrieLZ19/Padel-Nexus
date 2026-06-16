"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Trophy, CreditCard, Users, ClipboardList } from "lucide-react";
import { LicenciasService } from "@/utils/services/licencias";
import { useProfileStore } from "@/store/useProfileStore";
import CredencialQR from "@/components/perfil/CredencialDigital";

const Skeleton = () => (
  <div className="animate-pulse bg-white/5 rounded-3xl h-40" />
);

export default function PlayerDashboard() {
  const { profile, fetchProfile } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSolicitarLicencia = async () => {
    try {
      await LicenciasService.solicitarAlta();
      await fetchProfile();
    } catch (error) {
      console.error("No se pudo enviar la solicitud", error);
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
      <header className="flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-bold">
            Hola,{" "}
            <span className="text-padel-4">
              {profile?.nombre_completo?.split(" ")[0] || "Jugador"}
            </span>
          </h1>
          <p className="text-gray-400">
            Gestioná tu perfil, torneos y reservas.
          </p>
        </div>
        <Link
          href="/reservar"
          className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200"
        >
          Nueva Reserva
        </Link>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {!profile ? (
          Array(4)
            .fill(0)
            .map((_, i) => <Skeleton key={i} />)
        ) : (
          <>
            {/* Categoría */}
            <div className="bg-[#161616] p-8 rounded-3xl border border-white/5">
              <Trophy className="text-padel-4 mb-4" />
              <p className="text-sm text-gray-400">Categoría</p>
              <h2 className="text-2xl font-bold">
                {profile.categoria_padel || "S/C"}
              </h2>
            </div>

            {/* Licencia Dinámica con QR */}
            <div className="bg-[#161616] p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center">
              <CreditCard className="text-padel-4 mb-4 self-start" />
              <p className="text-sm text-gray-400 self-start">Licencia</p>

              {profile.licencias && profile.licencias.length > 0 ? (
                profile.licencias[0].estado === "activa" ? (
                  <div className="mt-4 flex flex-col items-center">
                    <CredencialQR usuarioId={profile.id} />
                    <h2 className="text-lg font-bold mt-3">
                      {profile.licencias[0].nro_licencia}
                    </h2>
                    <p className="text-[10px] text-padel-4 uppercase">Activa</p>
                  </div>
                ) : profile.licencias[0].estado === "Pendiente" ? (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-xs">
                    En revisión administrativa
                  </div>
                ) : (
                  <h2 className="text-xl font-bold mt-2 text-red-500">
                    Vencida
                  </h2>
                )
              ) : (
                <button
                  onClick={handleSolicitarLicencia}
                  className="mt-4 text-xs font-bold text-padel-4 border border-padel-4/30 px-3 py-2 rounded-lg hover:bg-padel-4/10"
                >
                  Solicitar Alta
                </button>
              )}
            </div>

            {/* Mis Torneos */}
            <Link
              href="/torneos"
              className="bg-[#161616] p-8 rounded-3xl border border-white/5 hover:border-padel-4/50 transition-all"
            >
              <ClipboardList className="text-padel-4 mb-4" />
              <p className="text-sm text-gray-400">Mis Torneos</p>
              <h2 className="text-2xl font-bold">Historial</h2>
            </Link>

            {/* Partidos */}
            <Link
              href="/partidos"
              className="bg-[#161616] p-8 rounded-3xl border border-white/5 hover:border-padel-4/50 transition-all"
            >
              <Users className="text-padel-4 mb-4" />
              <p className="text-sm text-gray-400">Partidos</p>
              <h2 className="text-2xl font-bold">Buscar cuarto</h2>
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
