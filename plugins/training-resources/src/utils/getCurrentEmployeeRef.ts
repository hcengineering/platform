//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { type Ref } from '@hcengineering/core'
import { getCurrentEmployee, type Employee } from '@hcengineering/contact'

export function getCurrentEmployeeRef (): Ref<Employee> {
  return getCurrentEmployee()
}
