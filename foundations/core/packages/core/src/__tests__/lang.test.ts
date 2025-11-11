import { makeLocalesTest } from '@hcengineering/platform'

it(
  'Locales are equale',
  makeLocalesTest((lang) => import(`../../lang/${lang}.json`))
)
