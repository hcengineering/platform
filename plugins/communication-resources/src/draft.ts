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

import { getCurrentAccount, type Ref, generateId } from '@hcengineering/core'
import { derived, get } from 'svelte/store'
import { type Location, location } from '@hcengineering/ui'
import { type Card } from '@hcengineering/card'
import { EmptyMarkup } from '@hcengineering/text'
import { getClient } from '@hcengineering/presentation'
import { type Applet } from '@hcengineering/communication'
import { type Message } from '@hcengineering/communication-types'
import { isBlobAttachment, isLinkPreviewAttachment, isAppletAttachment } from '@hcengineering/communication-shared'

import communication from './plugin'
import { type MessageDraft } from './types'
import { toMarkup } from './utils'

export const locationWorkspaceStore = derived(location, (loc: Location) => loc.path[1])

function geLocalStorageKey (card: Ref<Card>): string | undefined {
  const me = getCurrentAccount()
  const workspace = get(locationWorkspaceStore) ?? ''
  if (me == null || workspace === '') return undefined
  return `${workspace}.${me.uuid}.${card}.message_draft.v2`
}

export function getEmptyDraft (): MessageDraft {
  return {
    _id: generateId(),
    content: EmptyMarkup,
    blobs: [],
    links: [],
    applets: []
  }
}

export function getDraft (card: Ref<Card>): MessageDraft {
  const key = geLocalStorageKey(card)

  if (key === undefined) {
    return getEmptyDraft()
  }
  const stored = localStorage.getItem(key)

  if (stored == null) {
    return getEmptyDraft()
  }

  try {
    const data = JSON.parse(stored)
    return {
      _id: data._id ?? generateId(),
      content: data.content ?? EmptyMarkup,
      blobs: data.blobs ?? [],
      links: data.links ?? [],
      applets: data.applets ?? []
    }
  } catch (e) {
    console.error(e)
    return getEmptyDraft()
  }
}

let timer: any | undefined

export function removeDraft (card: Ref<Card>): void {
  if (timer !== undefined) clearTimeout(timer)
  const key = geLocalStorageKey(card)
  if (key === undefined) return
  localStorage.removeItem(key)
}

export function saveDraft (card: Ref<Card>, draft: MessageDraft, force = false): void {
  if (timer !== undefined) clearTimeout(timer)
  const key = geLocalStorageKey(card)
  if (key === undefined) return

  if (force) {
    localStorage.setItem(key, JSON.stringify(draft))
  } else {
    timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(draft))
    }, 1000)
  }
}

export function messageToDraft (message: Message): MessageDraft {
  const applets: Applet[] = getClient().getModel().findAllSync(communication.class.Applet, {})
  return {
    _id: message.id,
    content: toMarkup(message.content),
    blobs: message.attachments.filter(isBlobAttachment).map((it) => it.params),
    links: message.attachments.filter(isLinkPreviewAttachment).map((it) => it.params),
    applets: message.attachments
      .filter(isAppletAttachment)
      .map((it) => ({
        id: it.id,
        type: it.type,
        appletId: applets.find((a) => a.type === it.type)?._id as any,
        params: it.params
      }))
      .filter((it) => it.appletId !== undefined)
  }
}
