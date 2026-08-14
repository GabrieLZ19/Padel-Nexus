"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  GRUPOS_MENU_SUPERADMIN,
  MENU_SUPERADMIN_FIJOS_INFERIOR,
  MENU_SUPERADMIN_FIJOS_SUPERIOR,
} from "@/utils/constants/menuPermissions";

interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
}

interface SuperadminSidebarNavProps {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}

function isActivePath(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(`${href}/`))
  );
}

function NavLink({
  item,
  active,
  compact,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link href={item.href} onClick={onNavigate} className="block">
      <div
        className={`flex items-center gap-3 rounded-xl transition-colors ${
          compact ? "px-3 py-2" : "px-4 py-2.5"
        } ${
          active
            ? "bg-brand-chartreuse text-[#111] font-bold"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
      >
        <item.icon className="size-4 shrink-0" />
        <span className="text-[13px] flex-1 truncate">{item.name}</span>
        {item.badge && item.badge > 0 ? (
          <span
            className={`min-w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black px-1 ${
              active
                ? "bg-[#111] text-brand-chartreuse"
                : "bg-brand-chartreuse text-brand-black"
            }`}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default function SuperadminSidebarNav({
  items,
  pathname,
  onNavigate,
}: SuperadminSidebarNavProps) {
  const byHref = useMemo(
    () => new Map(items.map((item) => [item.href, item])),
    [items],
  );

  const grupoActivo = GRUPOS_MENU_SUPERADMIN.find((grupo) =>
    grupo.hrefs.some((href) => isActivePath(pathname, href)),
  )?.id;

  const [abiertos, setAbiertos] = useState<Record<string, boolean>>(() =>
    grupoActivo ? { [grupoActivo]: true } : {},
  );

  useEffect(() => {
    if (!grupoActivo) return;
    setAbiertos((prev) =>
      prev[grupoActivo] ? prev : { ...prev, [grupoActivo]: true },
    );
  }, [grupoActivo]);

  const toggleGrupo = (id: string) => {
    setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fijosSuperior = MENU_SUPERADMIN_FIJOS_SUPERIOR.map((href) =>
    byHref.get(href),
  ).filter((item): item is NavItem => Boolean(item));

  const fijosInferior = MENU_SUPERADMIN_FIJOS_INFERIOR.map((href) =>
    byHref.get(href),
  ).filter((item): item is NavItem => Boolean(item));

  return (
    <nav className="flex-1 min-h-0 px-3 py-1 flex flex-col">
      <div className="space-y-0.5 pb-2">
        {fijosSuperior.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {GRUPOS_MENU_SUPERADMIN.map((grupo) => {
          const hijos = grupo.hrefs
            .map((href) => byHref.get(href))
            .filter((item): item is NavItem => Boolean(item));
          if (hijos.length === 0) return null;

          const abierto = Boolean(abiertos[grupo.id]);
          const grupoTieneActivo = hijos.some((item) =>
            isActivePath(pathname, item.href),
          );

          return (
            <div key={grupo.id} className="rounded-xl">
              <button
                type="button"
                onClick={() => toggleGrupo(grupo.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.16em] transition-colors cursor-pointer ${
                  grupoTieneActivo
                    ? "text-brand-chartreuse"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
                aria-expanded={abierto}
              >
                {grupo.label}
                <motion.span
                  animate={{ rotate: abierto ? 0 : -90 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex"
                >
                  <ChevronDown className="size-3.5" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {abierto ? (
                  <motion.div
                    key={`${grupo.id}-panel`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      initial={{ y: -8 }}
                      animate={{ y: 0 }}
                      exit={{ y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-0.5 mb-1 ml-2 pl-2 border-l border-white/10 space-y-0.5"
                    >
                      {hijos.map((item, index) => (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.18,
                            delay: 0.04 * index,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <NavLink
                            item={item}
                            compact
                            active={isActivePath(pathname, item.href)}
                            onNavigate={onNavigate}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="pt-2 mt-1 border-t border-white/5 space-y-0.5">
        {fijosInferior.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}
