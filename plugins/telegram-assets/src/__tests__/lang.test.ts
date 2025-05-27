import { makeLocalesTest } from '@hcengineering/platform'

it(
  'Locales are equal',
  makeLocalesTest((lang) => import(`../../lang/${lang}.json`))
)
