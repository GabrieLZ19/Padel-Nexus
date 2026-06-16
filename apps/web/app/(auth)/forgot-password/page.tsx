"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/callback?next=/update-password`,
        },
      );

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error al solicitar recuperación:", error.message);
      setError(
        "Hubo un problema al procesar tu solicitud. Verificá que el email sea correcto.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "w-full pl-12 pr-4 py-3.5 bg-[#161616] rounded-xl border border-white/5 text-white placeholder-gray-500 " +
    "focus:outline-none focus:border-padel-4 focus:ring-1 focus:ring-padel-4 transition-all " +
    "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_#161616_inset_!important] " +
    "[&:-webkit-autofill]:[-webkit-text-fill-color:white_!important] " +
    "caret-white";

  return (
    <div className="flex min-h-screen bg-padel-1 text-white font-sans relative">
      {/* Columna Izquierda - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-padel-3 flex-col justify-center px-20 border-r border-padel-2 relative z-10">
        <div className="mb-10 relative size-24">
          <div className="absolute inset-0 bg-padel-4 rounded-3xl blur-2xl opacity-40"></div>
          <div className="relative size-full bg-padel-4 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(204,255,0,0.2)] border border-white/10">
            <span className="text-padel-1 font-bold text-[5rem] leading-none mb-1">
              ∞
            </span>
          </div>
        </div>
        <h2 className="text-4xl font-semibold text-white mb-2 tracking-tight">
          Recuperá tu acceso
        </h2>
        <h1 className="text-7xl font-extrabold mb-8 tracking-tight text-white">
          Padel Nexus
        </h1>
        <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
          No te preocupes, a todos nos pasa. Ingresá tu correo electrónico y te
          enviaremos las instrucciones para crear una nueva contraseña.
        </p>
      </div>

      {/* Columna Derecha - Formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-padel-1 relative z-10">
        <div className="w-full max-w-md bg-transparent p-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="size-4" /> Volver al inicio de sesión
          </Link>

          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Restablecer contraseña
            </h2>
            <p className="text-lg text-gray-400">
              Enviaremos un enlace a tu correo.
            </p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success ? (
              <div className="bg-padel-4/10 border border-padel-4/30 text-padel-4 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
                <CheckCircle2 className="size-10 mb-2" />
                <h3 className="text-xl font-bold text-white">
                  ¡Correo enviado!
                </h3>
                <p className="text-sm text-gray-300">
                  Si existe una cuenta asociada a <strong>{email}</strong>,
                  recibirás un enlace para restablecer tu contraseña en los
                  próximos minutos.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">
                    Email de tu cuenta
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-5" />
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
                  className="w-full bg-padel-4 hover:bg-[#b3e600] disabled:bg-padel-2 disabled:text-gray-500 text-padel-1 font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2.5 text-lg shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-[0_0_25px_rgba(204,255,0,0.3)]"
                >
                  {loading ? (
                    <span className="animate-pulse">Enviando...</span>
                  ) : (
                    <>
                      Enviar enlace <ArrowRight className="size-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
