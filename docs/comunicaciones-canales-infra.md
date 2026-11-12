# Comunicaciones CRM — Resend (email) y WhatsApp

Documento interno para no olvidar configuración de infraestructura y preguntas al cliente (FAP / federación). Relacionado con **ENT-7**, **PUB-1** (recuperación de contraseña) y feature 20.0 (campañas multicanal).

El código ya soporta canales `in_app`, `email` y `whatsapp`. Sin variables de entorno, el email y WhatsApp figuran como **omitidos** en métricas del historial de campañas (comportamiento esperado hasta configurar proveedores).

---

## 1. Resend (email transaccional y campañas)

### Variables en el API (`apps/api`)

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `RESEND_API_KEY` | Sí, para enviar | Recuperación de contraseña y campañas (cuando estén habilitadas) |
| `RESEND_FROM_AUTH` | Recomendada | Recuperación de clave. Ej.: `Padel Nexus <no-responder@padelnexus.app>` |
| `RESEND_CAMPAIGN_FROM_EMAIL` | Recomendada | Solo la dirección de campañas: `info@padelnexus.app` (el nombre visible lo arma el API: `FAP · Padel Nexus <info@...>`) |
| `RESEND_FROM` | Legacy / fallback | Si falta `RESEND_FROM_AUTH`, se usa acá para auth |
| `RESEND_CAMPANA_EMAIL_HABILITADO` | Recomendada | `true` solo con plan Resend pago. En free dejar **sin valor** o `false` (campañas solo in-app; recuperación sigue activa). |
| `FRONTEND_URL` | Sí | Pie de campaña y link «Gestionar notificaciones» → `/mi-perfil/ajustes#notificaciones` |

Implementación actual: `comunicaciones-canales.service.ts`, `recuperacionPasswordEmail.ts`, `utils/resendConfig.ts`.

### Checklist técnico (nosotros)

- [x] Dominio `padelnexus.app` verificado en Resend (Hostinger).
- [ ] Cargar `RESEND_API_KEY` en Render (nunca en frontend ni en el repo).
- [ ] `RESEND_FROM_AUTH=Padel Nexus <no-responder@padelnexus.app>`
- [ ] `RESEND_CAMPAIGN_FROM_EMAIL=info@padelnexus.app` (sin activar campañas hasta plan pago).
- [ ] Probar recuperación (`POST /api/perfiles/recuperar-password`) y campaña chica **solo in-app** mientras email de campaña esté off.
- [ ] Con `padelnexus.app` en Vercel: `RECUPERACION_PASSWORD_REDIRECT_URL` y Redirect URLs en Supabase Auth.
- [ ] Revisar historial: **Email: omitidos** esperado en campañas hasta `RESEND_CAMPANA_EMAIL_HABILITADO=true`.

### Preguntas al cliente

1. ¿Qué dominio oficial debe aparecer como remitente (ej. `@federacionpadel.org.ar` o subdominio `comunicaciones.`...)?
2. ¿Quién administra DNS del dominio para agregar registros de Resend?
3. ¿Hay política de firma o pie legal obligatorio en mails institucionales (razón social, contacto, baja)?
4. ¿Límite de volumen esperado por campaña (para plan Resend y reputación)?
5. ¿Los correos de recuperación de contraseña deben salir por el mismo remitente que las campañas o uno distinto (`auth@` vs `comunicaciones@`)?

### QA sin Resend

- Las campañas con canal Email siguen creando notificaciones in-app si está marcado.
- Métricas mostrarán omitidos en email (`omitido_config`) — correcto hasta tener API key.

---

## 2. WhatsApp (fase 2 — integración pendiente)

### Estado en código

- Flag: `WHATSAPP_CAMPANAS_HABILITADO=true` habilita el intento de envío.
- Sin proveedor implementado, `enviarWhatsApp` devuelve `omitido_config` y registra log en servidor (`comunicaciones-canales.service.ts`).
- La UI del CRM indica que WhatsApp es fase 2; el historial muestra entregas/omitidos por canal.

### Preguntas al cliente (definir antes de desarrollar)

1. **Proveedor:** ¿Meta Cloud API (WhatsApp Business Platform) directo, BSP (Twilio, MessageBird, Gupshup, otro) o número ya contratado por la federación?
2. **Número:** ¿Línea nueva dedicada a Padel Nexus o número institucional existente? ¿Quién es titular del WABA (WhatsApp Business Account)?
3. **Plantillas:** ¿Solo mensajes de utilidad/transaccional aprobados por Meta, o también marketing? (Las campañas masivas del CRM suelen requerir plantillas aprobadas y categoría correcta.)
4. **Opt-in:** ¿Cómo confirman consentimiento del jugador para WhatsApp (checkbox en registro, preferencias en perfil, reglamento FAP)? Hoy existe `preferencias_notificacion.whatsapp` en perfiles — ¿regla de negocio oficial?
5. **Contenido:** ¿Título + cuerpo de campaña debe mapearse a una plantilla fija con variables, o textos libres (solo posible en ventana de conversación 24 h)?
6. **Horarios y alcance:** ¿Restricciones de envío (solo horario laboral, no menores sin consentimiento parental)?
7. **Presupuesto y volumen:** Mensajes estimados por mes; quién paga la cuenta Meta/BSP.

### Checklist técnico (cuando haya respuestas)

- [ ] Elegir proveedor y obtener credenciales (token, phone number ID, WABA ID).
- [ ] Definir variables de entorno (nombres a acordar; ej. `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_CAMPANAS_HABILITADO=true`).
- [ ] Implementar envío en `ComunicacionesCanalesService.enviarWhatsApp` (hoy es stub).
- [ ] Registrar plantillas en Meta y mapear campos `titulo` / `mensaje` / `action_url` del CRM.
- [ ] Prueba en sandbox Meta con números de prueba; luego smoke con cuenta QA del PDF.
- [ ] Documentar en runbook de deploy las nuevas variables.

---

## 3. Supabase Auth (complemento a Resend)

Recuperación de contraseña también depende de **Supabase Auth** (Site URL, Redirect URLs `/update-password`, plantilla de mail si no se usa Resend custom). Ver cierre **PUB-1** en el plan de re-test.

Coordinar con el cliente si el mail de auth lo envía Supabase (SMTP propio en proyecto `tsmgxvygmdskhyhnjqvv`) o solo Resend vía API.

---

## 4. Verificación manual sugerida (post-config)

1. Campaña CRM: audiencia pequeña, canales **In-app + Email**; revisar historial (entregados/omitidos, aperturas/clics in-app).
2. Jugador sin email en perfil: debe incrementar **omitidos** en email, no error 500.
3. Con `WHATSAPP_CAMPANAS_HABILITADO=false` (default): WhatsApp en **omitidos**; con flag true y sin integración, igual `omitido_config` hasta implementar proveedor.

---

## 5. Referencias en repo

- Envío multicanal: `apps/api/src/services/comunicaciones.service.ts` (`enviarCampana`)
- Canales: `apps/api/src/services/comunicaciones-canales.service.ts`
- Métricas: `apps/api/src/services/comunicaciones-metricas.service.ts`
- UI historial: `apps/web/components/comunicaciones/ComunicacionesPanel.tsx`
- Tests contrato: `apps/api/test/ent7ComunicacionesCanales.test.ts`
