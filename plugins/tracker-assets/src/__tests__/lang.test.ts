import { makeLocalesTest } from '@hcengineering/platform'

it(
  'Locales are equale',
  makeLocalesTest(
    (lang) => import(`../../lang/${lang}.json`),
    ['cs', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt', 'pt-br', 'zh']
  )
)
