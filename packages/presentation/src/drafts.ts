import { getCurrentAccount } from '@hcengineering/core'
import { fetchMetadataLocalStorage, setMetadataLocalStorage } from '@hcengineering/ui'
import { get, writable } from 'svelte/store'
import presentation from './plugin'

/**
 * @public
 */
// eslint-disable-next-line
export const draftStore = writable<Record<string, any>>(fetchMetadataLocalStorage(presentation.metadata.Draft) || {})

/**
 * @public
 */
export function updateDraftStore (id: string, draft: any): void {
  draftStore.update((drafts) => {
    if (draft !== undefined) {
      drafts[id] = draft
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete drafts[id]
    }
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
    return drafts
  })
}

/**
 * @public
 */
export function updateUserDraft (id: string, draft: any): void {
  const me = getCurrentAccount()._id
  draftStore.update((drafts) => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const userDrafts: Record<string, any> = drafts[me] || {}
    userDrafts[id] = draft
    drafts[me] = userDrafts
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
    return drafts
  })
}

/**
 * @public
 */
export function getUserDraft (id: string): any {
  const me = getCurrentAccount()._id
  const drafts: Record<string, any> = get(draftStore)
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const userDrafts: Record<string, any> = drafts[me] || {}
  const draft: Record<string, any> = userDrafts[id]
  return draft
}

/**
 * @public
 */
export function isUserDraftExists (id: string): boolean {
  const me = getCurrentAccount()._id
  const drafts: Record<string, any> = get(draftStore)
  const userDrafts: Record<string, any> = drafts[me]
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!userDrafts) {
    return false
  }
  const draftRecord: Record<string, any> = userDrafts[id]
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!draftRecord) {
    return false
  }
  return true
}
