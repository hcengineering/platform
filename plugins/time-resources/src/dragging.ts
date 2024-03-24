import type { IntlString } from '@hcengineering/platform'
import type { ToDo } from '@hcengineering/time'
import { writable } from 'svelte/store'

interface ToDoDragging {
  item: ToDo | null
  itemIndex: number | null
  groupName: IntlString | null
  projectId: string | false | null
  overItemIndex: number | null
  overGroupName: IntlString | null
  overProjectId: string | false | null
}

export const dragging = writable<ToDoDragging>({
  item: null,
  itemIndex: null,
  groupName: null,
  projectId: null,
  overItemIndex: null,
  overGroupName: null,
  overProjectId: null
})
