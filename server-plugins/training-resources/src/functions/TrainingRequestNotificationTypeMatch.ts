//
// Copyright © 2024 Hardcore Engineering Inc.
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

import contact, { type Employee, type PersonAccount } from '@hcengineering/contact'
import { type Account, type Ref, type TxCUD } from '@hcengineering/core'
import type { NotificationType } from '@hcengineering/notification'
import type { TriggerControl } from '@hcengineering/server-core'
import type { TrainingRequest } from '@hcengineering/training'
import { isTxCreateDoc } from '../utils/isTxCreateDoc'
import { isTxUpdateDoc } from '../utils/isTxUpdateDoc'

export function TrainingRequestNotificationTypeMatch (
  tx: TxCUD<TrainingRequest>,
  doc: TrainingRequest,
  user: Ref<Account>[],
  type: NotificationType,
  control: TriggerControl
): boolean {
  if (isTxCreateDoc(tx)) {
    const employeeRef: Ref<Employee> = control.modelDb.findAllSync(contact.class.PersonAccount, {
      _id: user[0] as Ref<PersonAccount>
    })[0]?.person as Ref<Employee>
    return doc.trainees.includes(employeeRef)
  }

  if (isTxUpdateDoc(tx)) {
    const pushed = tx.operations.$push?.trainees
    if (pushed === undefined) {
      return false
    }

    const employeeRef: Ref<Employee> = control.modelDb.findAllSync(contact.class.PersonAccount, {
      _id: user[0] as Ref<PersonAccount>
    })[0]?.person as Ref<Employee>
    const newTrainees = typeof pushed === 'object' ? pushed.$each : [pushed]
    return newTrainees.includes(employeeRef)
  }

  return false
}
