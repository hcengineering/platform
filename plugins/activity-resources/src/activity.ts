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
import activity, { type ActivityMessage, type SavedMessage } from '@hcengineering/activity'
import core, { type Class, type Ref, SortingOrder, type WithLookup } from '@hcengineering/core'
import { writable } from 'svelte/store'
import { createQuery, getClient } from '@hcengineering/presentation'
import view, { type ObjectPresenter } from '@hcengineering/view'
import { type AnySvelteComponent } from '@hcengineering/ui'
import { getResource } from '@hcengineering/platform'

export const savedMessagesStore = writable<Array<WithLookup<SavedMessage>>>([])
export const messageInFocus = writable<Ref<ActivityMessage> | undefined>(undefined)
export const presentersStore = writable<Map<Ref<Class<ActivityMessage>>, AnySvelteComponent>>(new Map())

const savedMessagesQuery = createQuery(true)

export function loadSavedMessages (): void {
  const client = getClient()

  if (client !== undefined) {
    savedMessagesQuery.query(
      activity.class.SavedMessage,
      { space: core.space.Workspace },
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

async function loadPresenters (): Promise<void> {
  const client = getClient()

  if (client !== undefined) {
    const client = getClient()
    const hierarchy = client.getHierarchy()

    const classes = hierarchy.getDescendants(activity.class.ActivityMessage)
    const presenters: Array<[Ref<Class<ActivityMessage>>, ObjectPresenter | undefined]> = classes.map((value) => [
      value,
      hierarchy.classHierarchyMixin(value, view.mixin.ObjectPresenter)
    ])
    const res = new Map<Ref<Class<ActivityMessage>>, AnySvelteComponent>()

    for (const [key, value] of presenters) {
      if (value === undefined) continue
      const component = await getResource(value.presenter)
      res.set(key, component)
    }

    presentersStore.set(res)
  } else {
    setTimeout(() => {
      void loadPresenters()
    }, 50)
  }
}

void loadPresenters()
