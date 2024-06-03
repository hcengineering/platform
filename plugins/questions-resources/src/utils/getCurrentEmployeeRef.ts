//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { getCurrentAccount, type Ref } from '@hcengineering/core'
import { type Employee, type PersonAccount } from '@hcengineering/contact'

export function getCurrentEmployeeRef (): Ref<Employee> {
  return (getCurrentAccount() as PersonAccount).person as Ref<Employee>
}
