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

import { IntlString, mergeIds } from '@hcengineering/platform'

import telegram, { telegramId } from '@hcengineering/telegram'
import { AnyComponent } from '@hcengineering/ui'

export default mergeIds(telegramId, telegram, {
  string: {
    Next: '' as IntlString,
    Back: '' as IntlString,
    Connect: '' as IntlString,
    Connecting: '' as IntlString,
    ConnectFull: '' as IntlString,
    Password: '' as IntlString,
    Phone: '' as IntlString,
    PhonePlaceholder: '' as IntlString,
    PhoneDescr: '' as IntlString,
    PasswordDescr: '' as IntlString,
    CodeDescr: '' as IntlString,
    Cancel: '' as IntlString,
    Share: '' as IntlString,
    PublishSelected: '' as IntlString,
    MessagesSelected: '' as IntlString
  },
  component: {
    MessagePresenter: '' as AnyComponent
  }
})
