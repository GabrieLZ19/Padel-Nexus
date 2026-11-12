-- ENT-19: alias/CBU/titular de transferencia configurables por federación y asociación

ALTER TABLE federaciones
  ADD COLUMN IF NOT EXISTS licencia_pago_alias text,
  ADD COLUMN IF NOT EXISTS licencia_pago_cbu text,
  ADD COLUMN IF NOT EXISTS licencia_pago_titular text;

ALTER TABLE asociaciones
  ADD COLUMN IF NOT EXISTS licencia_pago_alias text,
  ADD COLUMN IF NOT EXISTS licencia_pago_cbu text,
  ADD COLUMN IF NOT EXISTS licencia_pago_titular text;

COMMENT ON COLUMN federaciones.licencia_pago_alias IS 'Alias para transferencia de pago de licencias FAP';
COMMENT ON COLUMN federaciones.licencia_pago_cbu IS 'CBU/CVU para transferencia de pago de licencias FAP';
COMMENT ON COLUMN federaciones.licencia_pago_titular IS 'Titular de la cuenta de cobro de licencias';

COMMENT ON COLUMN asociaciones.licencia_pago_alias IS 'Override provincial: alias para pago de licencias';
COMMENT ON COLUMN asociaciones.licencia_pago_cbu IS 'Override provincial: CBU/CVU para pago de licencias';
COMMENT ON COLUMN asociaciones.licencia_pago_titular IS 'Override provincial: titular de cuenta de cobro';
