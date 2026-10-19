import { Loader } from './i18n'

function makeLocaleMatcher (target: object): object {
  return Object.entries(target).reduce(
    (obj, [key, value]) => ({
      ...obj,
      [key]: typeof value === 'string' ? expect.any(String) : makeLocaleMatcher(value)
    }),
    {}
  )
}

/**
 * Languages every locale set is checked against, `en` being the reference.
 * @public
 */
export const localeTestLangs = ['en', 'ru', 'es', 'pl', 'pt', 'pt-br', 'zh', 'fr', 'cs', 'it', 'de', 'ja', 'ko', 'tr']

/**
 * Checks that every language defines exactly the keys of `en`.
 *
 * @public
 * @param loader -
 * @param skip - languages known to be incomplete for this package; remove an
 * entry once its translation is complete, do not add new ones.
 * @returns
 */
export function makeLocalesTest (loader: Loader, skip: string[] = []) {
  return async () => {
    const langs = localeTestLangs.filter((lang) => !skip.includes(lang))
    const [target, ...rest] = await Promise.all(langs.map(loader))
    const matcher = makeLocaleMatcher(target)
    rest.forEach((loc, i) => {
      expect({ lang: langs[i + 1], loc }).toEqual({ lang: langs[i + 1], loc: matcher })
    })
  }
}
