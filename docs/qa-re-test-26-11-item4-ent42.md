# Re-test 26/11 — Item 4: ENT-42 (padrón FAP Latin-1)

## Problema

El HTML del padrón FAP interpretado como UTF-8 corrompía tildes y eñes en nombres y localidades.

## Cambios

- API: decodificación robusta del HTML (`decodificarHtmlPadronFap`) y patch de perfil alineado con Latin-1/UTF-8.
- Script `importPadronFap`: lectura por buffer; flags `--sanear-acentos` / `--solo-sanear`.

## Tests

```bash
cd apps/api && pnpm exec node --experimental-strip-types --import ./test/register-ts-loader.mjs --test test/ent42PadronLatin1.test.ts
```