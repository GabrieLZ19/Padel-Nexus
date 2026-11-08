alter table public.comunicaciones_campanas
  add column if not exists canales text[] not null default array['in_app']::text[],
  add column if not exists metricas jsonb not null default '{}'::jsonb;

alter table public.comunicaciones_campana_destinatarios
  add column if not exists canal text not null default 'in_app',
  add column if not exists abierto_en timestamptz,
  add column if not exists clic_en timestamptz;

create unique index if not exists comunicaciones_campana_destinatarios_unico_canal
  on public.comunicaciones_campana_destinatarios (campana_id, usuario_id, canal);

comment on column public.comunicaciones_campanas.canales is 'Canales usados en el envio: in_app, email, whatsapp (feature 20.0)';
comment on column public.comunicaciones_campanas.metricas is 'Entregas, aperturas y clics agregados por campana';
