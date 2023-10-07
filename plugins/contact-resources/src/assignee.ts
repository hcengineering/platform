import { Person } from '@hcengineering/contact'
import { Ref } from '@hcengineering/core'
import { IntlString } from '@hcengineering/platform'

/**
 * @public
 */
export interface AssigneeCategory {
  label: IntlString
  func: (val: Array<Ref<Person>>) => Promise<Array<Ref<Person>>>
}
