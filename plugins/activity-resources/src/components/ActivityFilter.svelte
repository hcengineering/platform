<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { ActionIcon, eventToHTMLElement, Icon, Label, showPopup } from '@hcengineering/ui'
  import { ActivityMessage, ActivityMessagesFilter } from '@hcengineering/activity'

  import activity from '../plugin'
  import FilterPopup from './FilterPopup.svelte'
  import IconClose from './icons/Close.svelte'
  import IconFilter from './icons/Filter.svelte'
  import { sortActivityMessages } from '../activityMessagesUtils'

  export let messages: ActivityMessage[]
  export let object: Doc
  export let isNewestFirst = false

  const allId = activity.ids.AllFilter
  const client = getClient()

  let filtered: ActivityMessage[]
  let filters: ActivityMessagesFilter[] = []

  const saved = localStorage.getItem('activity-filter')

  let selectedFiltersRefs: Ref<ActivityMessagesFilter>[] | Ref<ActivityMessagesFilter> = saved
    ? (JSON.parse(saved) as Ref<ActivityMessagesFilter>[])
    : allId
  let selectedFilters: ActivityMessagesFilter[] = []

  $: localStorage.setItem('activity-filter', JSON.stringify(selectedFiltersRefs))
  $: localStorage.setItem('activity-newest-first', JSON.stringify(isNewestFirst))

  client.findAll(activity.class.ActivityMessagesFilter, {}).then((res) => {
    filters = res

    if (saved !== null && saved !== undefined) {
      const temp: Ref<ActivityMessagesFilter>[] | Ref<ActivityMessagesFilter> = JSON.parse(saved)
      if (temp !== allId && Array.isArray(temp)) {
        selectedFiltersRefs = temp.filter((it) => filters.findIndex((f) => it === f._id) > -1)
        if (selectedFiltersRefs.length === 0) {
          selectedFiltersRefs = allId
        }
      } else {
        selectedFiltersRefs = allId
      }
    }
  })

  const handleOptions = (ev: MouseEvent): void => {
    showPopup(
      FilterPopup,
      { selectedFiltersRefs, filters },
      eventToHTMLElement(ev),
      () => {},
      (res) => {
        if (res === undefined) return
        if (res.action === 'toggle') {
          isNewestFirst = res.value
          return
        }
        const selected = res.value as Ref<ActivityMessagesFilter>[]
        const isAll = selected.length === filters.length || selected.length === 0
        if (res.action === 'select') selectedFiltersRefs = isAll ? allId : selected
      }
    )
  }

  const dispatch = createEventDispatcher()

  async function updateFilterActions (
    messages: ActivityMessage[],
    filters: ActivityMessagesFilter[],
    selected: Ref<Doc>[] | Ref<ActivityMessagesFilter>,
    sortOrder: SortingOrder
  ): Promise<void> {
    const sortedMessages = sortActivityMessages(messages, sortOrder).sort(({ isPinned }) =>
      isPinned && sortOrder === SortingOrder.Ascending ? -1 : 1
    )

    if (selected === allId) {
      filtered = sortedMessages

      dispatch('update', filtered)
    } else {
      selectedFilters = filters.filter((filter) => selected.includes(filter._id))
      const filterActions: ((message: ActivityMessage, _class?: Ref<Doc>) => boolean)[] = []
      for (const filter of selectedFilters) {
        const fltr = await getResource(filter.filter)
        filterActions.push(fltr)
      }
      filtered = messages.filter((message) => filterActions.some((f) => f(message, object._class)))
      dispatch('update', filtered)
    }
  }

  $: void updateFilterActions(
    messages,
    filters,
    selectedFiltersRefs,
    isNewestFirst ? SortingOrder.Descending : SortingOrder.Ascending
  )
</script>

<div class="w-4 min-w-4 max-w-4" />
{#if selectedFiltersRefs === 'All'}
  <div class="antiSection-header__tag highlight">
    <Label label={activity.string.All} />
  </div>
{:else}
  {#each selectedFilters as filter}
    <div class="antiSection-header__tag overflow-label">
      <Label label={filter.label} />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="tag-icon"
        on:click={() => {
          if (selectedFiltersRefs !== allId && Array.isArray(selectedFiltersRefs)) {
            const ids = selectedFiltersRefs.filter((it) => it !== filter._id)
            selectedFiltersRefs = ids.length > 0 ? ids : allId
          }
        }}
      >
        <Icon icon={IconClose} size={'small'} />
      </div>
    </div>
  {/each}
{/if}
<div class="w-4 min-w-4 max-w-4" />
<ActionIcon icon={IconFilter} size={'medium'} action={handleOptions} />
