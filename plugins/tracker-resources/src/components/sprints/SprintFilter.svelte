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
  import { Class, Doc, DocumentQuery, FindResult, Ref, SortingOrder } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Project, Sprint, SprintStatus } from '@hcengineering/tracker'
  import ui, { deviceOptionsStore, Icon, Label, CheckBox, Loading, resizeObserver } from '@hcengineering/ui'
  import view, { Filter } from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  import { sprintStatusAssets } from '../../types'
  import SprintTitlePresenter from './SprintTitlePresenter.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Project> | undefined = undefined
  export let filter: Filter
  export let onChange: (e: Filter) => void

  filter.modes = filter.modes ?? [view.filter.FilterObjectIn, view.filter.FilterObjectNin]
  filter.mode = filter.mode ?? filter.modes[0]

  const dispatch = createEventDispatcher()
  let search: string = ''
  let phTraslate: string = ''
  let searchInput: HTMLInputElement
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })

  let values: Sprint[] = []
  let objectsPromise: Promise<FindResult<Sprint>> | undefined = undefined
  let selectedValues: Set<Ref<Sprint> | undefined | null> = new Set()

  const client = getClient()
  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    values = []
    selectedValues.clear()
    const spaceQuery: DocumentQuery<Sprint> = space ? { space } : {}
    const resultQuery: DocumentQuery<Sprint> =
      search !== ''
        ? {
            label: { $like: '%' + search + '%' }
          }
        : {}
    objectsPromise = client.findAll(
      tracker.class.Sprint,
      { ...resultQuery, ...spaceQuery },
      {
        sort: { label: SortingOrder.Ascending }
      }
    )
    const res = await objectsPromise

    values = res
    selectedValues = new Set(res.map((p) => p._id).filter((p) => filter.value.includes(p)))
    if (filter.value.includes(undefined) || filter.value.includes(null)) {
      selectedValues.add(undefined)
    }
    objectsPromise = undefined
  }

  function isSelected (value: Ref<Sprint> | undefined, values: Set<Ref<Sprint> | undefined | null>): boolean {
    return values.has(value)
  }

  function toggle (value: Ref<Sprint> | undefined): void {
    if (isSelected(value, selectedValues)) {
      selectedValues.delete(value)
    } else {
      selectedValues.add(value)
    }
    selectedValues = selectedValues
    filter.value = Array.from(selectedValues)
    onChange(filter)
  }

  function getStatusItem (status: SprintStatus, docs: Sprint[]): Sprint[] {
    return docs.filter((p) => p.status === status)
  }

  function getStatuses (): SprintStatus[] {
    const res = Array.from(Object.values(SprintStatus).filter((v) => !isNaN(Number(v)))) as SprintStatus[]
    return res
  }

  onMount(() => {
    if (searchInput && !$deviceOptionsStore.isMobile) searchInput.focus()
  })
  getValues(search)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <input
      bind:this={searchInput}
      type="text"
      bind:value={search}
      on:change={() => {
        getValues(search)
      }}
      placeholder={phTraslate}
    />
  </div>
  <div class="scroll">
    <div class="box">
      {#if objectsPromise}
        <Loading />
      {:else}
        <button
          class="menu-item"
          on:click={() => {
            toggle(undefined)
          }}
        >
          <div class="flex clear-mins">
            <div class="check pointer-events-none">
              <CheckBox checked={isSelected(undefined, selectedValues)} primary />
            </div>
            <Label label={ui.string.NotSelected} />
          </div>
        </button>
        {#each getStatuses() as group}
          {@const status = sprintStatusAssets[group]}
          {@const items = getStatusItem(group, values)}
          {#if items.length > 0}
            <div class="flex-row-center p-1">
              <Icon icon={status.icon} size={'small'} />
              <div class="ml-2">
                <Label label={status.label} />
              </div>
            </div>
            {#each items as doc}
              <button
                class="menu-item"
                on:click={() => {
                  toggle(doc._id)
                }}
              >
                <div class="flex clear-mins">
                  <div class="check pointer-events-none">
                    <CheckBox checked={isSelected(doc._id, selectedValues)} primary />
                  </div>
                  <SprintTitlePresenter value={doc} />
                </div>
              </button>
            {/each}
          {/if}
        {/each}
      {/if}
    </div>
  </div>
</div>
