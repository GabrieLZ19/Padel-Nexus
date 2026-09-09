"use client";

import { useEffect, useState } from "react";
import { LegalService, type LegalDocumento } from "@/utils/services/legal";

function renderMarkdownLite(md: string): string {
  return md
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

export function LegalDocumentoView({
  tipo,
}: {
  tipo: "tyc" | "privacidad" | "privacidad_menores";
}) {
  const [doc, setDoc] = useState<LegalDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await LegalService.getDocumento(tipo);
        if (!cancelled) setDoc(data);
      } catch {
        if (!cancelled) setError("No se pudo cargar el documento.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tipo]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-gray-400">
        Cargando documento…
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-red-400">
        {error || "Documento no disponible."}
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-brand-white">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-chartreuse">
        Versión {doc.version}
      </p>
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight">
        {doc.titulo}
      </h1>
      <div
        className="prose prose-invert prose-headings:text-brand-white prose-p:text-gray-300 max-w-none space-y-4 text-sm leading-relaxed text-gray-300 [&_h1]:text-2xl [&_h2]:mt-8 [&_h2]:text-xl [&_h3]:text-lg"
        dangerouslySetInnerHTML={{
          __html: `<p>${renderMarkdownLite(doc.contenido_md)}</p>`,
        }}
      />
    </article>
  );
}
