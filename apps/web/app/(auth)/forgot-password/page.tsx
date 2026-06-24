"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { isAxiosError } from "axios";
import { PerfilService } from "@/utils/services/perfil";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Servicio centralizado
      const data = await PerfilService.recuperarPassword(email);
      if (data.exito) setSuccess(true);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(
          err.response?.data?.error ||
            "No pudimos procesar la solicitud en este momento.",
        );
      } else {
        setError("Error de red. Intente de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "w-full pl-12 pr-4 py-3.5 bg-brand-input rounded-xl border border-brand-white/5 text-brand-white placeholder-gray-500 " +
    "focus:outline-none focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse transition-all caret-white";

  return (
    <div className="flex min-h-screen bg-brand-black text-brand-white font-sans relative">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-card flex-col justify-center px-20 border-r border-brand-white/5 relative z-10">
        <div className="mb-10 relative size-24 drop-shadow-[0_0_20px_rgba(203,254,1,0.15)]">
          <Image
            src="/brand/LogoAccessory.svg"
            alt="Padel Nexus"
            width={96}
            height={96}
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-4xl font-semibold text-brand-white mb-2 tracking-tight">
          Recuperá tu acceso
        </h2>
        <h1 className="text-7xl font-extrabold mb-8 tracking-tight text-brand-white">
          Padel Nexus
        </h1>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-brand-black relative z-10">
        <div className="w-full max-w-md bg-transparent">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-brand-white transition-colors mb-10"
          >
            <ArrowLeft className="size-4" /> Volver al inicio de sesión
          </Link>

          <div className="mb-8">
            <h2 className="text-4xl font-bold text-brand-white mb-2 tracking-tight">
              Restablecer clave
            </h2>
            <p className="text-lg text-gray-400">
              Te enviaremos un enlace a tu correo.
            </p>
          </div>

          {success ? (
            <div className="bg-brand-chartreuse/10 border border-brand-chartreuse/30 text-brand-chartreuse p-6 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="size-10 mx-auto" />
              <h3 className="text-xl font-bold text-brand-white">
                Enlace despachado
              </h3>
              <p className="text-sm text-gray-300">
                Si el correo existe en el circuito FAP, recibirás un link de
                actualización.
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
                  <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2.5">
                  Email registrado
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-5" />
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputStyles}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-chartreuse text-brand-black font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2.5 text-lg shadow-md hover:opacity-95 cursor-pointer"
              >
                {loading ? (
                  <span className="animate-pulse">Enviando...</span>
                ) : (
                  <>
                    {`Enviar enlace `}
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
