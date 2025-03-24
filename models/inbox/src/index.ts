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

import { AccountRole } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import workbench from '@hcengineering/model-workbench'
import { inboxId } from '@hcengineering/inbox'

import inbox from './plugin'

export { inboxId } from '@hcengineering/inbox'
export { inboxOperation } from './migration'
export default inbox

export function createModel (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: inbox.string.Inbox,
      icon: inbox.icon.Inbox,
      alias: inboxId,
      accessLevel: AccountRole.User,
      hidden: true,
      component: inbox.component.InboxApplication
    },
    inbox.app.Inbox
  )
}
