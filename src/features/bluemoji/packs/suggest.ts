import {normalizeAlias} from '../alias'

/** `name`, or `name_2`, `name_3`... if the user already has it. */
export function suggestFreeAlias(
  name: string,
  have: ReadonlySet<string>,
): string {
  const base = name.replace(/^:|:$/g, '')
  const taken = (alias: string) => {
    try {
      return have.has(normalizeAlias(alias))
    } catch {
      return false
    }
  }
  if (!taken(base)) return base
  for (let n = 2; n < 100; n++) {
    if (!taken(`${base}_${n}`)) return `${base}_${n}`
  }
  return base
}
