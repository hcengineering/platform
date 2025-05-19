// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

import { Asset, IntlString, Metadata, plugin, Plugin } from '@hcengineering/platform'
import { CardSection } from '@hcengineering/card'
import { Ref } from '@hcengineering/core'

export * from './types'

/**
 * @public
 */
export const communicationId = 'communication' as Plugin

export default plugin(communicationId, {
  icon: {
    Bell: '' as Asset,
    BellCrossed: '' as Asset
  },
  metadata: {
    Enabled: '' as Metadata<boolean>
  },
  string: {
    Messages: '' as IntlString,
    FirstMessages: '' as IntlString,
    LatestMessages: '' as IntlString,
    Subscribe: '' as IntlString,
    Unsubscribe: '' as IntlString
  },
  ids: {
    CardMessagesSection: '' as Ref<CardSection>
  }
})
