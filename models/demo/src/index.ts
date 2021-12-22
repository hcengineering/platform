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

import { Employee, EmployeeAccount } from '@anticrm/contact'
import core, { generateId } from '@anticrm/core'
import { Builder } from '@anticrm/model'
import contact from '@anticrm/model-contact'

export function createDemo (builder: Builder): void {
  const rosamund = generateId<Employee>()
  const account = generateId<EmployeeAccount>()

  builder.createDoc<EmployeeAccount>(contact.class.EmployeeAccount, core.space.Model, {
    email: 'rosamund@hc.engineering',
    employee: rosamund,
    name: 'Chen,Rosamund'
  }, account, account)
}

export { createDeps } from './creation'
