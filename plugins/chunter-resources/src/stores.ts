//
// Copyright © 2024 Hardcore Engineering Inc.
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
//

import { writable } from 'svelte/store'
import { type ChatMessage } from '@hcengineering/chunter'
import { type Markup, type Ref } from '@hcengineering/core'
import { languageStore } from '@hcengineering/ui'
import { type ActivityMessage } from '@hcengineering/activity'

export const translatingMessagesStore = writable<Set<Ref<ChatMessage>>>(new Set())
export const translatedMessagesStore = writable<Map<Ref<ChatMessage>, Markup>>(new Map())
export const shownTranslatedMessagesStore = writable<Set<Ref<ChatMessage>>>(new Set())

export const threadMessagesStore = writable<ActivityMessage | undefined>(undefined)

languageStore.subscribe(() => {
  translatedMessagesStore.set(new Map())
  shownTranslatedMessagesStore.set(new Set())
})
