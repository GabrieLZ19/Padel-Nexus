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

/** Token de sesión para Socket.IO (lectura server-side de `padel_token` HttpOnly). */
export async function obtenerTokenSocketCliente(): Promise<string | null> {
  const res = await fetch("/api/auth/socket-token", {
    method: "GET",
    credentials: "same-origin",
  });
  if (!res.ok) {
    return null;
  }
  const body = (await res.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  return token && token !== "undefined" && token !== "null" ? token : null;
}
