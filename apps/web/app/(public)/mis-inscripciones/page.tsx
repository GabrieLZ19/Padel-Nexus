import { redirect } from "next/navigation";

export default function MisInscripcionesRedirectPage() {
  redirect("/mi-perfil/torneos");
}