<!--
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
-->
<script lang="ts">
  import { type Doc, type DocumentQuery, type Ref, type WithLookup } from '@hcengineering/core'
  import drive, { type Drive, type Folder } from '@hcengineering/drive'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import { Scroller, SearchEdit } from '@hcengineering/ui'
  import {
    FilterBar,
    FilterButton,
    ViewletContentView,
    ViewletSelector,
    ViewletSettingButton
  } from '@hcengineering/view-resources'

  import { createFiles } from '../utils'

  export let space: Ref<Drive>
  export let parent: Ref<Folder>
  export let readonly: boolean = false

  const _class = drive.class.Resource

  $: query = { space, parent }

  let dragover = false

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let viewOptions: ViewOptions | undefined

  let search = ''
  let searchQuery: DocumentQuery<Doc> = { ...query }
  let resultQuery: DocumentQuery<Doc> = { ...searchQuery }

  $: if (query !== undefined) updateSearchQuery(search)
  $: resultQuery = { ...searchQuery }

  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }

  async function handleDrop (e: DragEvent): Promise<void> {
    if (readonly) {
      return
    }
    // progress = true
    const list = e.dataTransfer?.files
    if (list !== undefined && list.length !== 0) {
      await createFiles(list, space, parent)
    }
    // progress = false
  }
</script>

{#if space !== undefined}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="antiComponent"
    class:solid={dragover}
    on:dragover|preventDefault={() => {
      dragover = true
    }}
    on:dragleave={() => {
      dragover = false
    }}
    on:drop|preventDefault|stopPropagation={(ev) => {
      void handleDrop(ev)
    }}
  >
    <div class="ac-header full divide caption-height">
      <div class="ac-header-full small-gap">
        <SearchEdit bind:value={search} on:change={() => {}} />
        <div class="buttons-divider" />
        <FilterButton {_class} {space} />
      </div>
      <div class="ac-header-full medium-gap">
        <ViewletSettingButton bind:viewOptions bind:viewlet />
        <ViewletSelector bind:viewlet viewletQuery={{ attachTo: _class }} />
      </div>
    </div>

    {#if viewlet !== undefined && viewOptions}
      <FilterBar {_class} {space} query={searchQuery} {viewOptions} on:change={(e) => (resultQuery = e.detail)} />
      <div class="popupPanel rowContent">
        {#if viewlet}
          <Scroller horizontal={true}>
            <ViewletContentView {_class} {viewlet} query={resultQuery} {space} {viewOptions} />
          </Scroller>
        {/if}
      </div>
    {/if}
  </div>
{/if}
