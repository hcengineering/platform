import { fetchMetadataLocalStorage, setMetadataLocalStorage } from '@hcengineering/ui'
import { writable, get } from 'svelte/store'
import { getClient } from '.'
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
    drafts[id] = draft
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
    return drafts
  })
}

/**
 * @public
 */
export function updateUserDraft (id: string, draft: any): void {
  const client = getClient()
  draftStore.update((drafts) => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const userDrafts: Record<string, any> = drafts[client.user] || {}
    userDrafts[id] = draft
    drafts[client.user] = userDrafts
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
    return drafts
  })
}

/**
 * @public
 */
export function getUserDraft (id: string): any {
  const client = getClient()
  const drafts: Record<string, any> = get(draftStore)
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const userDrafts: Record<string, any> = drafts[client.user] || {}
  const draft: Record<string, any> = userDrafts[id]
  return draft
}

/**
 * @public
 */
export function isUserDraftExists (id: string): boolean {
  const client = getClient()
  const drafts: Record<string, any> = get(draftStore)
  const userDrafts: Record<string, any> = drafts[client.user]
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
