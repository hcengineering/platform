import { IntlString } from '@hcengineering/platform'
import contact from './plugin'

/**
 * @public
 */
export type AssigneeCategory = 'CurrentUser' | 'Assigned' | 'PreviouslyAssigned' | 'ComponentLead' | 'Members' | 'Other'

const assigneeCategoryTitleMap: Record<AssigneeCategory, IntlString> = Object.freeze({
  CurrentUser: contact.string.CategoryCurrentUser,
  Assigned: contact.string.Assigned,
  PreviouslyAssigned: contact.string.CategoryPreviousAssigned,
  ComponentLead: contact.string.CategoryComponentLead,
  Members: contact.string.Members,
  Other: contact.string.CategoryOther
})

/**
 * @public
 */
export const assigneeCategoryOrder: AssigneeCategory[] = [
  'CurrentUser',
  'Assigned',
  'PreviouslyAssigned',
  'ComponentLead',
  'Members',
  'Other'
]

/**
 * @public
 */
export function getCategoryTitle (category: AssigneeCategory | undefined): IntlString {
  const cat: AssigneeCategory = category ?? 'Other'
  return assigneeCategoryTitleMap[cat]
}
