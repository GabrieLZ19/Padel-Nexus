import Image from "next/image";
import Link from "next/link";

export type NotFoundLink = {
  href: string;
  label: string;
};

type NotFoundViewProps = {
  homeHref?: string;
  homeLabel?: string;
  secondary?: NotFoundLink;
  shortcuts?: NotFoundLink[];
  showBrandHeader?: boolean;
  compact?: boolean;
};

function CanchaFuera() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[400px]">
      <svg
        viewBox="0 0 400 260"
        className="w-full h-auto text-brand-white"
        aria-hidden
      >
        <defs>
          <filter id="nf-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="28"
          y="22"
          width="268"
          height="216"
          rx="10"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="10"
        />
        <rect
          x="42"
          y="36"
          width="240"
          height="188"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="2"
        />
        <line
          x1="42"
          y1="130"
          x2="282"
          y2="130"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="2.5"
        />
        <line
          x1="162"
          y1="36"
          x2="162"
          y2="224"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="1.5"
        />
        <line
          x1="42"
          y1="88"
          x2="282"
          y2="88"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1.2"
        />
        <line
          x1="42"
          y1="172"
          x2="282"
          y2="172"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1.2"
        />

        <g className="nf-ball">
          <circle
            cx="338"
            cy="78"
            r="16"
            fill="#cbfe01"
            filter="url(#nf-glow)"
          />
          <path
            d="M330 70c6 4 10 10 12 18"
            fill="none"
            stroke="#0b0b0b"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>
      </svg>

      <span className="absolute top-6 right-2 sm:right-0 rotate-12 rounded-md border border-brand-chartreuse/40 bg-brand-chartreuse px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-brand-black shadow-[0_0_24px_rgba(203,254,1,0.25)]">
        Out
      </span>
    </div>
  );
}

export default function NotFoundView({
  homeHref = "/",
  homeLabel = "Volver al inicio",
  secondary = { href: "/torneos", label: "Ver torneos" },
  shortcuts = [
    { href: "/ranking", label: "Ranking" },
    { href: "/reservar", label: "Reservar" },
    { href: "/marketplace", label: "Marketplace" },
  ],
  showBrandHeader = true,
  compact = false,
}: NotFoundViewProps) {
  return (
    <div
      className={`relative flex flex-col bg-brand-black text-brand-white font-sans selection:bg-brand-chartreuse selection:text-brand-black overflow-hidden ${
        compact ? "min-h-full" : "min-h-dvh"
      }`}
    >
      <style>{`
        @keyframes nf-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nf-ball {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(6px, -10px); }
        }
        .nf-rise { animation: nf-rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .nf-ball { animation: nf-ball 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-32 size-[420px] rounded-full bg-brand-moss/20 blur-[140px]" />
        <div className="absolute top-[35%] -left-40 size-[360px] rounded-full bg-brand-chartreuse/5 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {showBrandHeader && (
        <header className="relative z-10 px-6 sm:px-10 py-6">
          <Link href={homeHref} className="inline-flex items-center">
            <Image
              src="/brand/LogoHorizontal.svg"
              alt="Padel Nexus"
              width={160}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </header>
      )}

      <main
        className={`relative z-10 flex flex-1 flex-col items-center justify-center px-6 sm:px-10 ${
          compact ? "py-10" : "py-8 sm:py-16"
        }`}
      >
        <div className="nf-rise w-full max-w-3xl text-center">
          <p className="mb-6 text-[11px] font-black uppercase tracking-[0.32em] text-brand-chartreuse">
            Error 404
          </p>

          <CanchaFuera />

          <h1 className="mt-2 text-[92px] sm:text-[128px] font-extrabold leading-none tracking-tighter">
            404
          </h1>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
            Esta cancha no existe
          </p>
          <p className="mx-auto mt-4 max-w-lg text-base sm:text-lg text-gray-400 leading-relaxed">
            La página que buscás se fue afuera o el enlace quedó viejo. Volvé al
            ecosistema y seguí por torneos, ranking o reservas.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={homeHref}
              className="inline-flex justify-center items-center min-h-12 bg-brand-chartreuse hover:opacity-90 text-brand-black px-8 rounded-xl font-bold transition-all"
            >
              {homeLabel}
            </Link>
            {secondary && (
              <Link
                href={secondary.href}
                className="inline-flex justify-center items-center min-h-12 rounded-xl border border-brand-white/10 bg-brand-card px-8 font-bold hover:bg-brand-white/5 transition-all"
              >
                {secondary.label}
              </Link>
            )}
          </div>

          {shortcuts.length > 0 && (
            <nav
              aria-label="Atajos"
              className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-500"
            >
              {shortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-brand-chartreuse transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}
