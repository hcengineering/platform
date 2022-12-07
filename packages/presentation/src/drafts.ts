import { fetchMetadataLocalStorage, setMetadataLocalStorage } from '@hcengineering/ui'
import { writable, get } from 'svelte/store'
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
export function updateDraftRecord (id: string, userId: string, draft: any): void {
  draftStore.update((drafts) => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const userDrafts: Record<string, any> = drafts[userId] || {}
    userDrafts[id] = draft
    drafts[userId] = userDrafts
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
    return drafts
  })
}

/**
 * @public
 */
export function getDraft (id: string, userId: string): any {
  const drafts: Record<string, any> = get(draftStore)
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const userDrafts: Record<string, any> = drafts[userId] || {}
  const draft: Record<string, any> = userDrafts[id]
  return draft
}

/**
 * @public
 */
export function isDraftExists (id: string, userId: string): boolean {
  const drafts: Record<string, any> = get(draftStore)
  const userDrafts: Record<string, any> = drafts[userId]
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
