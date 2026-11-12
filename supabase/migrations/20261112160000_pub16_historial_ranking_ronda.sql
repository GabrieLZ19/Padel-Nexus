-- PUB-16: registrar instancia/ronda en movimientos de historial_ranking
alter table public.historial_ranking
  add column if not exists ronda text;

comment on column public.historial_ranking.ronda is
  'Instancia de llave o zona asociada al otorgamiento de puntos (p. ej. OCTAVOS, Zona A).';
