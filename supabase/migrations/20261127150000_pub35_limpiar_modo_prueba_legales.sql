-- PUB-35: quitar leyenda «Modo de Prueba» en documentos legales activos.

UPDATE public.legal_documentos
SET titulo = 'Términos y Condiciones Generales de Uso'
WHERE activo = true
  AND tipo = 'tyc'
  AND titulo LIKE '%Modo de Prueba%';

UPDATE public.legal_documentos
SET titulo = 'Política de Privacidad'
WHERE activo = true
  AND tipo = 'privacidad'
  AND titulo LIKE '%Modo de Prueba%';