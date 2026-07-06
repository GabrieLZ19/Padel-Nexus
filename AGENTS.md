# Instrucciones del Proyecto Padel Nexus

## Contexto
Este workspace contiene el CRM web y la API para Padel Nexus. El foco actual es terminar la Fase 1: torneos, generación de llaves (bracket), pagos, datos de perfil del jugador y reglas de competencia FAP, manteniendo el código preparado para la Fase 2.

**Proyecto Supabase:** `tsmgxvygmdskhyhnjqvv` (App Padel) — Región: `sa-east-1`

## Principios Fundamentales
- Preferir la implementación actual del repositorio y la documentación local por encima de suposiciones.
- Mantener los cambios pequeños, coherentes y alineados con la arquitectura existente.
- Tratar el flujo de torneos, la edición de llaves y la confirmación de pagos como rutas de dominio de alta prioridad.
- Cuando auth o acceso a datos toque Supabase, seguir la guía de seguridad del skill `supabase` y verificar contra la documentación actual.
- Nunca exponer `service_role` ni claves secretas en el código frontend.

## Reglas de Dominio
- Roles administrativos autorizados: `admin`, `superadmin`, `admin_federacion`, `admin_provincial`.
- Rol de usuario público: `usuario`.
- Las validaciones de rol deben usar un helper compartido o tipo compartido, no listas de strings duplicadas en múltiples archivos.
- El editor de llaves debe ser **no destructivo** por defecto.
- Cualquier override manual que cambie partidos, parejas o zonas debe requerir un motivo y ser auditable.
- La Fase 1 debe mantener un significado único para estos estados en frontend, backend y Supabase: `pendiente`, `confirmado`, `pagado`, `borrador`, `en curso`, `completado`, `habilitado`.

## Áreas Prioritarias de Fase 1
1. **Torneos y Llaves**
   - El detalle de torneo y la generación de llaves son la superficie principal del CRM.
   - Drag and drop para reasignación de parejas es requerido para el flujo del editor.
   - Auditoría y overrides reversibles son requeridos para ediciones de admin.

2. **Inscripciones y Pagos**
   - La confirmación manual de pago debe alimentar el mismo estado usado para habilitar la siembra y generación de grupos.
   - El flujo del checkbox de admin debe ser rápido y explícito.

3. **Perfil del Jugador**
   - DNI y lugar de residencia son campos obligatorios en el flujo de perfil de Fase 1.
   - Los datos de perfil deben mantenerse alineados entre signup, ajustes de perfil y Supabase.

4. **Reglas de Competencia**
   - Las reglas FAP gobiernan los cortes de inscripción, categorías, validación de licencias, siembra y progresión de llaves.
   - Preferir una única fuente de verdad para reglas y estados de competencia.

## Convenciones del Código
- Preservar la estructura existente de Next.js App Router y route groups.
- Mantener los servicios backend responsables de la lógica de negocio; mantener los componentes de página enfocados en UI y orquestación de estado.
- Usar el cliente API centralizado para requests del frontend.
- Usar el cliente admin de Supabase solo en el backend.
- Preferir tipos explícitos sobre `any`.
- Evitar introducir nuevas abstracciones a menos que eliminen duplicación o arreglen un problema real de consistencia.

## Lista de Verificación
- Ejecutar lint y build para cualquier slice tocado cuando sea posible.
- Validar flujos de auth para login local, login con Google y logout.
- Validar detalle de torneo, generación de llaves y rutas de override de admin.
- Validar confirmación de pago y el estado que desbloquea siembra/grupos.
- Validar que las redirecciones basadas en rol sigan enviando admins al dashboard y usuarios al sitio público.

## Notas de Documentación
- `plan_frontend.md` es el plan de frontend activo y debe mantenerse sincronizado con la realidad de la implementación.
- Los documentos del Drive relevantes para esta fase incluyen arquitectura, notas de seguimiento, requerimientos de desarrollo y el reglamento de competencia FAP.
- Si un nuevo plan o regla entra en conflicto con el comportamiento actual, preferir las rutas de código reales y el estado verificado de Supabase.

## Cosas a Evitar
- No hardcodear lógica de permisos en múltiples lugares.
- No usar `user_metadata` como fuente de autorización.
- No hacer cambios destructivos en llaves sin confirmación y trail de auditoría.
- No agregar trabajo de implementación mobile en esta fase a menos que sea solo preparación de contratos de datos.
