const REEMPLAZO = "\uFFFD";

function prioridadReemplazoLatin1(pref: string, suf: string, byte: number): number {
  const l = pref.slice(-1).toLowerCase();
  const ll = pref.slice(-2, -1).toLowerCase();
  const f = suf.slice(0, 1).toLowerCase();
  const ff = suf.slice(0, 2).toLowerCase();
  let p = 0;

  if (byte === 0xf1) {
    if (l === "u" && f === "o") p += 120;
    if (l === "u" && f === "e") p += 118;
    if (l === "n" && f === "e") p += 115;
    if (l === "a" && f === "e") p += 110;
    if (l === "i" && f === "a") p += 100;
    if (l === "e" && f === "a") p += 80;
    if (l === "a" && f === "o") p += 70;
    if (l === "e" && f === "z") p += 85;
  }
  if (byte === 0xfa) {
    if (l === "s" && f === "s") p += 118;
    if (l === "q" && f === "e") p += 100;
    if (l === "b" && f === "l") p += 90;
  }
  if (byte === 0xe9) {
    if (l === "u" && f === "n") p += 120;
    if (ll === "q" && f === "n") p += 110;
    if (l === "i" && f === "n") p += 100;
    if (l === "s" && f === " ") p += 95;
    if (l === "s" && ff === " ") p += 95;
    if (l === "e" && f === "n") p += 85;
    if (l === "j" && f === "u") p += 90;
  }
  if (byte === 0xed) {
    if (l === "c" && f === "a") p += 120;
    if (l === "r" && f === "a") p += 115;
    if (pref.endsWith("art") && f === "n") p += 112;
    if (l === "m" && f === "n") p += 110;
    if (l === "l" && f === "p") p += 105;
    if (l === "d" && f === "g") p += 100;
    if (l === "r" && f === "g") p += 100;
    if (l === "z" && f === "q") p += 95;
    if (l === "t" && f === "a") p += 90;
    if (l === "a" && f === "s") p += 85;
    if (l === "c" && f === "o") p += 85;
  }
  if (byte === 0xf3) {
    if (l === "i" && f === "n") p += 118;
    if (l === "l" && f === "p") p += 115;
    if (l === "n" && f === ",") p += 90;
    if (l === "i" && f === ",") p += 85;
    if (l === "r" && f === "d") p += 80;
  }
  if (byte === 0xe1) {
    if (l === "n" && f === ",") p += 115;
    if (pref.length === 1 && l === "s" && f === "n") p += 115;
    if (l === "z" && f === "l") p += 110;
    if (l === "r" && f === ",") p += 100;
    if (l === "a" && f === "n") p += 95;
    if (l === "n" && f === "s") p += 90;
    if (l === "g" && f === " ") p += 80;
    if (l === "j" && f === "o") p += 95;
    if (l === "o" && f === "s") p += 75;
    if (l === "s" && f === " ") p += 75;
    if (l === "l" && f === "v") p += 75;
    if (pref.length === 0 && f === "l") p += 85;
    if (l === "v" && f === "a") p += 80;
    if (l === "v" && f === "e") p += 80;
    if (l === "s" && f === "t") p += 80;
    if (l === "h" && f === "c") p += 85;
    if (l === "b" && f === "l") p += 85;
    if (l === "p" && f === "s") p += 85;
    if (l === "a" && f === "g") p += 80;
    if (l === "c" && f === "a") p += 70;
  }
  if (byte === 0xfc) {
    if (l === "g" && ff === "er") p += 100;
  }
  if (byte === 0xba) {
    if (l === "n" && f === " ") p += 100;
  }
  if (byte === 0xc1 && pref.length === 0) p += 90;

  return p;
}

function elegirByteLatin1(pref: string, suf: string): number {
  let mejor = 0x80;
  let mejorP = -1;
  for (let b = 0x80; b <= 0xff; b += 1) {
    const p = prioridadReemplazoLatin1(pref, suf, b);
    if (p > mejorP) {
      mejorP = p;
      mejor = b;
    }
  }
  if (mejorP <= 0) {
    const f = suf.slice(0, 1).toLowerCase();
    if (f === "n") return 0xe9;
    if (f === "a" || f === "o") return 0xed;
    if (f === " ") return 0xe9;
    return 0xe1;
  }
  return mejor;
}

/**
 * Recupera tildes/ñ a partir de texto con U+FFFD (Latin-1 mal decodificado como UTF-8).
 */
export function repararTextoFffdLatin1(texto: string | null | undefined): string | null {
  if (texto == null) return null;
  if (!texto.includes(REEMPLAZO)) return texto;

  let resultado = texto;
  let iteraciones = 0;
  while (resultado.includes(REEMPLAZO) && iteraciones < 32) {
    iteraciones += 1;
    const idx = resultado.indexOf(REEMPLAZO);
    const pref = resultado.slice(0, idx);
    const suf = resultado.slice(idx + 1);
    const byte = elegirByteLatin1(pref, suf);
    resultado = pref + String.fromCharCode(byte) + suf;
  }

  return resultado.includes(REEMPLAZO) ? texto : resultado;
}