function ramaCorta(rama?: string | null): string {
  const r = String(rama || "").toLowerCase();
  if (r.startsWith("fem") || r.includes("dama")) return "Fem.";
  if (r.startsWith("mix")) return "Mix.";
  if (r.startsWith("mas") || r.includes("cab")) return "Masc.";
  return "";
}

function nombreBaseTorneo(
  nombre?: string | null,
  nivel?: string | null,
  rama?: string | null,
): string {
  let base = (nombre || "Torneo").trim();
  const sufijos = [
    `${nivel || ""} ${ramaCorta(rama)}`.trim(),
    nivel || "",
    ramaCorta(rama),
    rama || "",
  ].filter((s) => s.trim().length > 0);

  for (const s of sufijos) {
    const re = new RegExp(
      `[\\s—\\-–]*${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
      "i",
    );
    base = base.replace(re, "").trim();
  }
  return base || (nombre || "Torneo").trim();
}

/** Alineado a `nombreTorneoReplicado` del API (CLI-4). */
export function previewNombreTorneoReplicado(
  nombreOrigen: string,
  nivelOrigen: string | null | undefined,
  ramaOrigen: string | null | undefined,
  nivelNuevo: string,
  ramaNueva: string,
): string {
  const base = nombreBaseTorneo(nombreOrigen, nivelOrigen, ramaOrigen);
  const etiquetaRama = ramaCorta(ramaNueva) || String(ramaNueva || "").trim();
  return `${base} — ${nivelNuevo} ${etiquetaRama}`.trim();
}