-- Migración: Agregar campos de dirección, código postal y teléfono a la tabla clubes para geolocalización precisa
alter table public.clubes
  add column if not exists direccion text default null,
  add column if not exists codigo_postal text default null,
  add column if not exists telefono text default null;

comment on column public.clubes.direccion is 'Dirección física / calle y número del club';
comment on column public.clubes.codigo_postal is 'Código postal del club (ej. 1900 o CPA)';
comment on column public.clubes.telefono is 'Teléfono de contacto del club';
