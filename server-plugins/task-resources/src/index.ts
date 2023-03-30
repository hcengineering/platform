//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Employee } from '@hcengineering/contact'
import { AttachedDoc, Doc, Ref, Tx, TxCollectionCUD } from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import { getEmployeeAccount, getEmployeeAccountById } from '@hcengineering/server-notification'
import { createNotificationTxes } from '@hcengineering/server-notification-resources'
import task from '@hcengineering/task'

/**
 * @public
 */
export async function addAssigneeNotification (
  control: TriggerControl,
  res: Tx[],
  issue: Doc,
  assignee: Ref<Employee>,
  ptx: TxCollectionCUD<AttachedDoc, AttachedDoc>
): Promise<void> {
  const sender = await getEmployeeAccountById(ptx.modifiedBy, control)
  if (sender === undefined) {
    return
  }

  const receiver = await getEmployeeAccount(assignee, control)
  if (receiver === undefined) {
    return
  }

  const result = await createNotificationTxes(control, ptx, task.ids.AssigneedNotification, issue, sender, receiver)

  res.push(...result)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {}
})
