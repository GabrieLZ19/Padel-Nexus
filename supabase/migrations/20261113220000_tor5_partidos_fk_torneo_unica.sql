-- TOR-5: partidos tenía dos FK hacia torneos (fk_partidos_torneo y partidos_torneo_id_fkey),
-- lo que provoca PGRST201 en embeds torneos(...) y rompe la auditoría de corrección de resultados.
ALTER TABLE public.partidos
  DROP CONSTRAINT IF EXISTS partidos_torneo_id_fkey;
