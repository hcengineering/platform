import { fetchMetadataLocalStorage, setMetadataLocalStorage } from '@hcengineering/ui'
import { writable } from 'svelte/store'
import chunter from './plugin'

/**
 * @public
 */
// eslint-disable-next-line
export const draftStore = writable<Record<string, any>>(fetchMetadataLocalStorage(chunter.metadata.Draft) || {})
console.log('draft store', draftStore)

export function updateDraftStore (id: string, draft: any): void {
  draftStore.update((drafts) => {
    drafts[id] = draft
    setMetadataLocalStorage(chunter.metadata.Draft, drafts)
    return drafts
  })
}
