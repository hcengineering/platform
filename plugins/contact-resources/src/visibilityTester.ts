//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import contact, { getCurrentEmployee, type Person, type Employee } from '@hcengineering/contact'
import { getCurrentAccount } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { canKick } from './kickEmployee'

export async function canResendInvitation (employee: Employee): Promise<boolean> {
  return !employee.active
}

export async function canMergePersons (person: Person): Promise<boolean> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  return hierarchy.hasMixin(person, contact.mixin.Employee)
}

export async function canKickEmployee (employee: Employee | Employee[] | undefined): Promise<boolean> {
  return canKick(employee, getCurrentAccount().uuid, getCurrentEmployee())
}
