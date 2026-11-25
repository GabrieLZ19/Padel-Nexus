/**
 * PUB-29: datos de perfil que no deben exponerse sin autenticación en ranking.
 */
export function sanitizarPerfilRankingPublico(
  perfil: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...perfil };
  delete out.email;
  delete out.es_prueba;
  delete out.rol;
  delete out.dni;
  delete out.fecha_nacimiento;
  delete out.sexo;
  return out;
}