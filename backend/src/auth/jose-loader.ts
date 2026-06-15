/** Lazy ESM import — `jose` v6 is ESM-only; Nest/Lambda build is CommonJS. */
export type JoseModule = typeof import('jose');

let cached: JoseModule | undefined;

/** Avoid TS downleveling `import()` to `require()` in CommonJS output. */
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<JoseModule>;

export async function getJose(): Promise<JoseModule> {
  cached ??= await dynamicImport('jose');
  return cached;
}
