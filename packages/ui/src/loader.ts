import { addStringsLoader } from '@hcengineering/platform'
import { uiId } from './plugin'

addStringsLoader(uiId, async (lang: string) => require(`../lang/${lang}.json`))
