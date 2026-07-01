//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { type IntlString, mergeIds } from '@hcengineering/platform'
import { slackId } from '@hcengineering/slack'
import slack from '@hcengineering/slack-resources/src/plugin'

export default mergeIds(slackId, slack, {
  string: {
    IntegrationLabel: '' as IntlString,
    IntegrationDescription: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  }
})
