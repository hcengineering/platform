//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
//

import { Ref } from '@anticrm/core'
import { IntlString, mergeIds } from '@anticrm/platform'
import { telegramId } from '@anticrm/telegram'
import telegram from '@anticrm/telegram-resources/src/plugin'
import type { AnyComponent } from '@anticrm/ui'
import type { TxViewlet } from '@anticrm/activity'

export default mergeIds(telegramId, telegram, {
  string: {
    SharedMessages: '' as IntlString
  },
  ids: {
    TxSharedCreate: '' as Ref<TxViewlet>
  },
  activity: {
    TxSharedCreate: '' as AnyComponent
  }
})
