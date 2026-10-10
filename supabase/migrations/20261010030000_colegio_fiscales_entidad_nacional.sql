-- La Asociación Paranaense de Padel es provincial.
-- La sigla APA nombra al reglamento de la Asociación de Pádel Argentina,
-- no a esta asociación. Su colegio no es el de la federación nacional.

update public.asociaciones a
set
  tipo = 'asociacion',
  sigla = 'APP',
  federacion_id = f.id,
  updated_at = now()
from public.federaciones f
where f.sigla = 'FAP'
  and a.nombre = 'Asociación Paranaense de Padel'
  and a.sigla = 'APA'
  and a.tipo = 'federacion';
