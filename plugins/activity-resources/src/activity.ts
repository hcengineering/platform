import activity, { type ActivityMessage, type SavedMessage } from '@hcengineering/activity'
import { type Ref, SortingOrder, type WithLookup } from '@hcengineering/core'
import { writable } from 'svelte/store'
import { createQuery, getClient } from '@hcengineering/presentation'

export const savedMessagesStore = writable<Array<WithLookup<SavedMessage>>>([])
export const messageInFocus = writable<Ref<ActivityMessage> | undefined>(undefined)

const savedMessagesQuery = createQuery(true)

export function loadSavedMessages (): void {
  const client = getClient()

  if (client !== undefined) {
    savedMessagesQuery.query(
      activity.class.SavedMessage,
      {},
      (res) => {
        savedMessagesStore.set(res.filter(({ $lookup }) => $lookup?.attachedTo !== undefined))
      },
      { lookup: { attachedTo: activity.class.ActivityMessage }, sort: { modifiedOn: SortingOrder.Descending } }
    )
  } else {
    setTimeout(() => {
      loadSavedMessages()
    }, 50)
  }
}

loadSavedMessages()
