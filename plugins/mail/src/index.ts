//
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
//

import type { Class, Ref } from '@hcengineering/core'
import { IntlString, type Plugin, plugin } from '@hcengineering/platform'
import type { ChunterSpace } from '@hcengineering/chunter'
import type { AnyComponent } from '@hcengineering/ui'

export interface MailThread extends ChunterSpace {
  subject: string
  mailThreadId: string
  from: string
  to: string
}

/**
 * @public
 */
export const mailId = 'mail' as Plugin

export default plugin(mailId, {
  class: {
    MailThread: '' as Ref<Class<MailThread>>
  },
  component: {
    CreateMail: '' as AnyComponent,
    MailThreadPresenter: '' as AnyComponent,
    MailThread: '' as AnyComponent
  },
  string: {
    MailThread: '' as IntlString,
    MailThreadId: '' as IntlString,
    Subject: '' as IntlString,
    To: '' as IntlString,
    From: '' as IntlString,
    CreateMail: '' as IntlString
  }
})
