"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { PerfilService } from "@/utils/services/perfil";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

type AuthStatus = "loading" | "success" | "error";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { setProfile } = useProfileStore();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [mensaje, setMensaje] = useState(
    "Estableciendo canal de conexión seguro...",
  );

  useEffect(() => {
    const procesarHash = async () => {
      if (typeof window === "undefined") return;

      const supabase = getSupabaseBrowserClient();
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const hash = window.location.hash;

      let accessToken: string | null = null;

      if (code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          setStatus("error");
          setMensaje("No se pudo intercambiar el código de Google.");
          setTimeout(() => router.push("/login?error=oauth_failed"), 2500);
          return;
        }

        accessToken = data.session.access_token;
      } else if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get("access_token");
      }

      if (!accessToken) {
        setStatus("error");
        setMensaje("No se encontraron credenciales de autenticación.");
        setTimeout(() => router.push("/login"), 2500);
        return;
      }

      try {
        setMensaje("Sincronizando ficha con el ecosistema Padel Nexus...");
        const data = await PerfilService.verificarTokenGoogle(accessToken);

        if (data.exito && data.usuario) {
          // Guardamos las cookies de sesión
          document.cookie = `padel_token=${data.token}; path=/; max-age=${60 * 60 * 24}`;
          document.cookie = `padel_user_role=${data.usuario.rol}; path=/; max-age=${60 * 60 * 24}`;

          // Cambiamos el estado visual a éxito antes de redirigir
          setProfile(data.usuario);
          setStatus("success");
          setMensaje(
            `¡Bienvenido, ${data.usuario.nombre_completo || "Jugador"}! Conexión exitosa.`,
          );

          setTimeout(() => {
            router.push(data.usuario.rol !== "usuario" ? "/dashboard" : "/");
          }, 1400); // Damos espacio a que se aprecie la animación elástica de éxito
        } else {
          setStatus("error");
          setMensaje("La API rechazó la validación de la firma.");
          setTimeout(() => router.push("/login"), 2500);
        }
      } catch (error) {
        console.error("Error sincronizando sesión OAuth con Express:", error);
        setStatus("error");
        setMensaje("Problema de enlace. Redireccionando al login...");
        setTimeout(() => router.push("/login?error=sync_failed"), 3000);
      }
    };

    // Un pequeño delay inicial para que el ojo asimile la animación de carga sin saltos abruptos
    const timer = setTimeout(() => {
      procesarHash();
    }, 600);

    return () => clearTimeout(timer);
  }, [router, setProfile]);

  return (
    <div className="min-h-dvh bg-brand-black text-brand-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none">
      {/* GLOW DE FONDO DINÁMICO REACIVO AL ESTADO */}
      <div
        className={`absolute w-87.5 sm:w-125 h-87.5 sm:h-125 rounded-full blur-[120px] opacity-10 transition-all duration-1000 scale-100 ease-out pointer-events-none z-0 ${
          status === "loading"
            ? "bg-brand-chartreuse"
            : status === "success"
              ? "bg-emerald-500 scale-110"
              : "bg-red-500 scale-95"
        }`}
      />

      <div className="w-full max-w-sm bg-transparent relative z-10 flex flex-col items-center">
        {/* CONTENEDOR DE INDICADORES VISUALES ANIMADOS */}
        <div className="relative size-24 flex items-center justify-center mb-8">
          {status === "loading" && (
            <>
              {/* Círculo externo orbital */}
              <div className="absolute inset-0 border-2 border-brand-white/5 rounded-full" />
              {/* Spinner asimétrico fluido de la marca */}
              <div className="absolute inset-0 border-2 border-transparent border-t-brand-chartreuse border-r-brand-chartreuse/30 rounded-full animate-spin" />
              {/* Icono central de seguridad latiendo */}
              <ShieldCheck className="size-8 text-brand-chartreuse/60 animate-pulse" />
            </>
          )}

          {status === "success" && (
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center justify-center animate-in scale-in-50 duration-500 ease-out-back">
              <CheckCircle2 className="size-12 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 bg-red-500/10 rounded-full border border-red-500/20 flex items-center justify-center animate-in zoom-in-75 duration-300">
              <AlertCircle className="size-12 text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
            </div>
          )}
        </div>

        {/* TEXTOS FLUIDOS CON ANIMACIÓN DE ENTRADA */}
        <div className="space-y-2.5 text-center min-h-16 flex flex-col justify-center px-4">
          <p
            key={mensaje} // Provoca que el texto se vuelva a animar suavemente si cambia el string
            className={`text-base sm:text-lg font-medium tracking-tight text-gray-300 animate-in fade-in slide-in-from-bottom-2 duration-400 ease-out ${
              status === "success"
                ? "text-emerald-400 font-semibold"
                : status === "error"
                  ? "text-red-400"
                  : ""
            }`}
          >
            {mensaje}
          </p>

          {status === "loading" && (
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold animate-pulse">
              Acceso Seguro SSL
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
