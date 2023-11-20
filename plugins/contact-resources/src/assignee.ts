import { type Person } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'
import { type IntlString } from '@hcengineering/platform'

/**
 * @public
 */
export interface AssigneeCategory {
  label: IntlString
  func: (val: Array<Ref<Person>>) => Promise<Array<Ref<Person>>>
}
