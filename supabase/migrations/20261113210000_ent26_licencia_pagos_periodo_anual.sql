-- ENT-26: permitir período anual YYYY además de YYYY-MM en licencia_pagos.periodo
ALTER TABLE public.licencia_pagos
  DROP CONSTRAINT IF EXISTS licencia_pagos_periodo_check;

ALTER TABLE public.licencia_pagos
  ADD CONSTRAINT licencia_pagos_periodo_check
  CHECK (periodo ~ '^\d{4}(-\d{2})?$');
