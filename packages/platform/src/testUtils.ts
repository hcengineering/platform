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

const langs = ['en', 'ru']

/**
 * @public
 * @param loader -
 * @returns
 */
export function makeLocalesTest (loader: Loader) {
  return async () => {
    const [target, ...rest] = await Promise.all(langs.map(loader))
    const matcher = makeLocaleMatcher(target)
    rest.forEach((loc) => expect(loc).toEqual(matcher))
  }
}
