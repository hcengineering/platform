//
// Copyright © 2026 Hardcore Engineering Inc.
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

import contact, { type WorkspaceMemberStatus } from '@hcengineering/contact'
import type { AccountUuid } from '@hcengineering/core'
import { writable } from 'svelte/store'

import { createQuery } from '@hcengineering/presentation'

export const workspaceMemberStatusByAccountStore = writable<Map<AccountUuid, WorkspaceMemberStatus>>(new Map())

const workspaceMemberStatusQuery = createQuery(true)
let workspaceStatusesLoaded = false

export function loadWorkspaceMemberStatuses (): void {
  if (workspaceStatusesLoaded) return
  workspaceStatusesLoaded = true
  workspaceMemberStatusQuery.query(contact.class.WorkspaceMemberStatus, {}, (res) => {
    workspaceMemberStatusByAccountStore.set(new Map(res.map((it) => [it.user, it])))
  })
}
