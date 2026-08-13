"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  CreditCard,
  CheckCircle2,
  User,
  Calendar,
  MapPin,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Torneo } from "../../utils/types";
import {
  CheckElegibilidadApi,
  InscripcionesService,
} from "../../utils/services/inscripciones";
import FeedbackModal, { FeedbackModalProps } from "../ui/FeedbackModal";
import { useProfileStore } from "@/store/useProfileStore";
import { useRouter } from "next/navigation";
import {
  allChecksPassed,
  buildChecksElegibilidadJ1,
  hydrateTorneoRestrictions,
} from "@/utils/inscripcionElegibilidad";

interface InscripcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  torneo: Torneo;
}

function CheckRow({ check }: { check: CheckElegibilidadApi & { actionHref?: string; actionLabel?: string } }) {
  return (
    <li className="flex items-start gap-2.5 py-2">
      {check.passed ? (
        <CheckCircle2 className="size-3.5 text-brand-chartreuse shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="size-3.5 text-red-400 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-semibold leading-snug ${
            check.passed ? "text-white/90" : "text-red-300"
          }`}
        >
          {check.label}
        </p>
        {check.message && (
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
            {check.message}
          </p>
        )}
        {"actionHref" in check && check.actionHref && check.actionLabel ? (
          <Link
            href={check.actionHref}
            className="inline-block mt-1 text-[11px] font-bold text-brand-chartreuse hover:underline"
          >
            {check.actionLabel}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export default function InscripcionModal({
  isOpen,
  onClose,
  torneo: torneoRaw,
}: InscripcionModalProps) {
  const router = useRouter();
  const torneo = useMemo(
    () => hydrateTorneoRestrictions(torneoRaw),
    [torneoRaw],
  );
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [email2, setEmail2] = useState("");
  const [checkingJ2, setCheckingJ2] = useState(false);
  const [jugador2Nombre, setJugador2Nombre] = useState<string | null>(null);
  const [checksJ2, setChecksJ2] = useState<CheckElegibilidadApi[]>([]);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const { profile } = useProfileStore();

  const isIndividual = torneo.modalidad === "Individual";
  const checks = useMemo(
    () => buildChecksElegibilidadJ1(torneo, profile),
    [torneo, profile],
  );
  const failedChecks = checks.filter((c) => !c.passed);
  const passedCount = checks.filter((c) => c.passed).length;
  const visibleChecks = showAllChecks
    ? checks
    : failedChecks.length > 0
      ? failedChecks
      : checks.slice(0, 2);
  const canToggleChecks =
    failedChecks.length > 0
      ? checks.length > failedChecks.length
      : checks.length > 2;

  const j1Eligible = allChecksPassed(checks);
  const j2Eligible =
    isIndividual ||
    (email2.includes("@") &&
      !checkingJ2 &&
      checksJ2.length > 0 &&
      checksJ2.every((c) => c.passed));

  const jugador1Nombre = profile
    ? `${profile.apellido?.toUpperCase() ?? ""}, ${profile.nombre ?? ""}`.trim()
    : "";

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  useEffect(() => {
    if (!isOpen || isIndividual || !email2.includes("@")) {
      setChecksJ2([]);
      setJugador2Nombre(null);
      setCheckingJ2(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheckingJ2(true);
      try {
        const result = await InscripcionesService.chequearElegibilidad({
          torneo_id: torneo.id,
          usuario2_email: email2.trim(),
        });
        if (cancelled) return;
        setJugador2Nombre(result.jugador2?.nombre || null);
        setChecksJ2(result.checks_j2 || []);
      } catch {
        if (cancelled) return;
        setJugador2Nombre(null);
        setChecksJ2([
          {
            code: "lookup",
            label: "Jugador 2",
            passed: false,
            message: "No se pudo verificar al compañero.",
          },
        ]);
      } finally {
        if (!cancelled) setCheckingJ2(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email2, isIndividual, isOpen, torneo.id]);

  const canSubmit =
    j1Eligible &&
    !!profile &&
    (isIndividual || (email2.includes("@") && j2Eligible));

  const handleSubmit = async () => {
    if (!profile || !canSubmit) return;

    setLoading(true);
    try {
      await InscripcionesService.inscribir({
        torneo_id: torneo.id,
        usuario_id: profile.id,
        usuario2_email: isIndividual ? null : email2,
        jugador1_nombre: jugador1Nombre,
        jugador2_nombre: isIndividual ? "-" : jugador2Nombre || "",
        monto: Number(torneo.precio_inscripcion),
      });

      router.refresh();
      setStep("success");
    } catch (error: unknown) {
      console.error(error);

      interface ApiError {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      }
      const apiError = error as ApiError;
      const mensajeError =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        apiError.message ||
        "Ocurrió un error inesperado al procesar la inscripción.";

      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "No se pudo inscribir",
        description: mensajeError,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setEmail2("");
    setChecksJ2([]);
    setJugador2Nombre(null);
    setShowAllChecks(false);
    onClose();
  };

  const formatFechaTorneo = (iso?: string | null) => {
    if (!iso) return "—";
    const parts = iso.split("T")[0].split("-");
    if (parts.length < 3) return iso;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
              className="bg-[#121212] border border-white/10 w-full sm:max-w-[420px] rounded-t-3xl sm:rounded-3xl shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden"
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10 p-1.5 rounded-full hover:bg-white/5 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>

              {step === "form" ? (
                <>
                  <div className="px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-chartreuse mb-1.5">
                      Confirmar inscripción
                    </p>
                    <h2 className="text-xl font-bold text-white tracking-tight leading-snug pr-8">
                      {torneo.nombre}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/8 px-2 py-1 text-[11px] text-gray-300">
                        <Calendar className="size-3 text-brand-chartreuse/80" />
                        {formatFechaTorneo(torneo.fecha)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/8 px-2 py-1 text-[11px] text-gray-300">
                        <Users className="size-3 text-brand-chartreuse/80" />
                        {torneo.modalidad}
                      </span>
                      {(torneo.lugar || torneo.clubes?.nombre) && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/8 px-2 py-1 text-[11px] text-gray-300 max-w-full">
                          <MapPin className="size-3 text-brand-chartreuse/80 shrink-0" />
                          <span className="truncate">
                            {torneo.lugar || torneo.clubes?.nombre}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
                    {/* Elegibilidad compacta */}
                    <section>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          Tu elegibilidad
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            j1Eligible
                              ? "bg-brand-chartreuse/15 text-brand-chartreuse"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {passedCount}/{checks.length} OK
                        </span>
                      </div>

                      <ul className="rounded-xl border border-white/8 bg-white/[0.02] px-3 divide-y divide-white/5">
                        {visibleChecks.map((check) => (
                          <CheckRow key={check.code} check={check} />
                        ))}
                      </ul>

                      {canToggleChecks && (
                        <button
                          type="button"
                          onClick={() => setShowAllChecks((v) => !v)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-white cursor-pointer"
                        >
                          <ChevronDown
                            className={`size-3.5 transition-transform ${
                              showAllChecks ? "rotate-180" : ""
                            }`}
                          />
                          {showAllChecks
                            ? "Ver menos"
                            : `Ver todos los requisitos (${checks.length})`}
                        </button>
                      )}
                    </section>

                    {/* Jugadores */}
                    <section className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                          {isIndividual ? "Jugador" : "Jugador 1"}
                        </p>
                        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                          <div className="size-8 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/25 flex items-center justify-center shrink-0">
                            <User className="size-3.5 text-brand-chartreuse" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">
                              {jugador1Nombre || profile?.email || "—"}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-md shrink-0">
                            {profile?.categoria_padel || "S/C"}
                          </span>
                        </div>
                      </div>

                      {!isIndividual && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Compañero/a
                          </p>
                          <input
                            type="email"
                            placeholder="email@ejemplo.com"
                            className="w-full bg-white/[0.03] border border-white/10 px-3.5 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:border-brand-chartreuse/45 transition-colors placeholder:text-gray-600"
                            value={email2}
                            onChange={(e) => setEmail2(e.target.value)}
                          />
                          {checkingJ2 && (
                            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                              <Loader2 className="size-3 animate-spin" />
                              Verificando…
                            </p>
                          )}
                          {!checkingJ2 && jugador2Nombre && (
                            <p className="text-[12px] text-brand-chartreuse mt-1.5 font-semibold">
                              {jugador2Nombre}
                            </p>
                          )}
                          {!checkingJ2 &&
                            checksJ2.some((c) => !c.passed) && (
                              <ul className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 divide-y divide-red-500/10">
                                {checksJ2
                                  .filter((c) => !c.passed)
                                  .map((check) => (
                                    <CheckRow
                                      key={`${check.code}-${check.label}`}
                                      check={check}
                                    />
                                  ))}
                              </ul>
                            )}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Footer sticky */}
                  <div className="px-6 py-4 border-t border-white/8 bg-[#0e0e0e] shrink-0 space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          Total
                        </p>
                        <p className="text-2xl font-black text-brand-chartreuse tabular-nums leading-none mt-0.5">
                          $
                          {Number(torneo.precio_inscripcion).toLocaleString(
                            "es-AR",
                          )}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-500 text-right max-w-[9.5rem] leading-snug">
                        El admin valida el pago después.
                      </p>
                    </div>
                    <button
                      disabled={!canSubmit || loading}
                      onClick={handleSubmit}
                      className="w-full bg-brand-chartreuse disabled:opacity-35 disabled:grayscale hover:bg-[#b3e600] text-[#111] py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Procesando…
                        </span>
                      ) : (
                        <>
                          Confirmar inscripción
                          <CreditCard className="size-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-brand-chartreuse rounded-full flex items-center justify-center mb-5 shadow-[0_0_32px_rgba(203,254,1,0.25)]">
                    <CheckCircle2 className="size-8 text-[#111]" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">
                    ¡Inscripción enviada!
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Tu solicitud para{" "}
                    <span className="text-white font-semibold">
                      {torneo.nombre}
                    </span>{" "}
                    fue recibida. Te avisamos cuando confirmen el pago.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-50">
        <FeedbackModal {...feedbackModal} />
      </div>
    </>
  );
}
