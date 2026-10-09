import path from "node:path";

const EXTENSIONES_CONOCIDAS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".node",
]);

export async function resolve(specifier, context, nextResolve) {
  // `./env.config` tiene extensión `.config`; igual hay que resolver el `.ts`.
  if (
    specifier.startsWith(".") &&
    !EXTENSIONES_CONOCIDAS.has(path.extname(specifier))
  ) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
