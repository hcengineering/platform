// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

import { getCurrentAccount, type Ref } from '@hcengineering/core'
import { derived, get } from 'svelte/store'
import { type Location, location } from '@hcengineering/ui'
import { type Card } from '@hcengineering/card'
import { EmptyMarkup } from '@hcengineering/text'
import { type Message } from '@hcengineering/communication-types'

import { type MessageDraft } from './types'
import { toMarkup } from './utils'

export const locationWorkspaceStore = derived(location, (loc: Location) => loc.path[1])

function geLocalStorageKey (card: Ref<Card>): string | undefined {
  const me = getCurrentAccount()
  const workspace = get(locationWorkspaceStore) ?? ''
  if (me == null || workspace === '') return undefined
  return `${workspace}.${me.uuid}.${card}.message_draft.v1`
}

export function getEmptyDraft (): MessageDraft {
  return {
    content: EmptyMarkup,
    files: []
  }
}

export function getDraft (card: Ref<Card>): MessageDraft {
  const key = geLocalStorageKey(card)
  console.log('getDraft ket', key)
  if (key === undefined) {
    return getEmptyDraft()
  }
  const stored = localStorage.getItem(key)
  console.log('getDraft stored', stored)
  if (stored == null) {
    return getEmptyDraft()
  }

  try {
    const data = JSON.parse(stored)
    return {
      content: data.content,
      files: data.files
    }
  } catch (e) {
    console.error(e)
    return getEmptyDraft()
  }
}

export function removeDraft (card: Ref<Card>): void {
  const key = geLocalStorageKey(card)
  if (key === undefined) return
  localStorage.removeItem(key)
}

export function saveDraft (card: Ref<Card>, draft: MessageDraft): void {
  const key = geLocalStorageKey(card)
  if (key === undefined) return
  localStorage.setItem(key, JSON.stringify(draft))
}

export function messageToDraft (message: Message): MessageDraft {
  return {
    content: toMarkup(message.content),
    files: message.files.map((it) => ({
      blobId: it.blobId,
      type: it.type,
      filename: it.filename,
      size: it.size,
      metadata: it.meta
    }))
  }
}
