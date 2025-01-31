//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { loadMetadata } from '@hcengineering/platform'
import personalBrowser from '@hcengineering/personal-browser'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(personalBrowser.icon, {
  PersonalBrowser: `${icons}#browser`,
  Mail: `${icons}#browser`
})
