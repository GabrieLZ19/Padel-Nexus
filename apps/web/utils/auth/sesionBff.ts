export type EstablecerSesionPayload = {
  token: string;
  role?: string;
  rememberMe?: boolean;
};

export async function establecerSesionCliente(
  payload: EstablecerSesionPayload,
): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || "No se pudo guardar la sesión de forma segura en el servidor.",
    );
  }
}

export async function cerrarSesionCliente(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
  }).catch(() => {});
}
