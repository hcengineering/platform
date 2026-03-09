<!--
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
-->
<script lang="ts">
  import { Card } from '@hcengineering/card'
  import core, { DocumentQuery, getCurrentAccount, QuerySelector, Ref } from '@hcengineering/core'
  import { type Asset, type IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { IModeSelector, resolvedLocationStore } from '@hcengineering/ui'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import { createEventDispatcher } from 'svelte'

  import { getCurrentEmployee } from '@hcengineering/contact'
  import time, { ToDo } from '@hcengineering/time'
  import card from '../../plugin'

  export let config: [string, IntlString, object][] = []
  export let icon: Asset | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const socialIds = getCurrentAccount().socialIds
  const acc = getCurrentAccount().uuid
  const dispatch = createEventDispatcher()
  const user = getCurrentEmployee()

  let assigned: DocumentQuery<Card> = { _id: { $in: [] as Ref<Card>[] } }
  const created = { createdBy: { $in: socialIds } }
  let subscribed: DocumentQuery<Card> = { _id: { $in: [] as Ref<Card>[] } }

  let query: DocumentQuery<Card> = {}
  let modeSelectorProps: IModeSelector | undefined = undefined
  let mode: string | undefined = undefined

  const todoQuery = createQuery()
  $: todoQuery.query(time.class.ToDo, { user, doneOn: null }, (todos: ToDo[]) => {
    console.log('todos', todos)
    const cardIds = todos
      .filter((todo) => hierarchy.isDerived(todo.attachedToClass, card.class.Card))
      .map((todo) => todo.attachedTo as Ref<Card>)

    console.log('cardIds', cardIds)

    const uniqueIds = [...new Set(cardIds)]
    const curIds: Ref<Card>[] = (assigned._id as QuerySelector<Ref<Card>>)?.$in ?? []
    if (curIds.length !== uniqueIds.length || curIds.some((id, i) => uniqueIds[i] !== id)) {
      assigned = { _id: { $in: uniqueIds } }
    }
  })

  const subscribedQuery = createQuery()
  $: subscribedQuery.query(
    core.class.Collaborator,
    { collaborator: acc, attachedToClass: { $in: hierarchy.getDescendants(card.class.Card) } },
    (collaborators) => {
      const newSub = collaborators.map((it) => it.attachedTo as Ref<Card>)
      const curSub: Ref<Card>[] = (subscribed._id as QuerySelector<Ref<Card>>)?.$in ?? []
      if (curSub.length !== newSub.length || curSub.some((id, i) => newSub[i] !== id)) {
        subscribed = { _id: { $in: newSub } }
      }
    }
  )

  $: queries = { assigned, created, subscribed }
  $: mode = $resolvedLocationStore.query?.mode ?? undefined
  $: if (mode === undefined || (queries as any)[mode] === undefined) {
    if (config.length > 0) {
      ;[[mode]] = config
    }
  }
  $: if (mode !== undefined) {
    query = { ...(queries as any)[mode] }

    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }
</script>

{#if query !== undefined && modeSelectorProps !== undefined}
  <SpecialView
    _class={card.class.Card}
    baseQuery={query}
    space={undefined}
    label={card.string.MyCards}
    {icon}
    modes={modeSelectorProps}
  />
{/if}
