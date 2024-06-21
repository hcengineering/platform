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
  import { Scroller, SearchEdit } from '@hcengineering/ui'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    ViewletContentView,
    ViewletSelector,
    ViewletSettingButton
  } from '@hcengineering/view-resources'

  import FileDropArea from './FileDropArea.svelte'

  export let space: Ref<Drive>
  export let parent: Ref<Folder>
  export let readonly: boolean = false

  const _class = drive.class.Resource

  $: query = { space, parent }

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
</script>

{#if space !== undefined}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="antiComponent">
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
      <div class="popupPanel rowContent" on:contextmenu>
        {#if viewlet}
          <Scroller horizontal={true}>
            <FileDropArea {space} {parent} canDrop={() => !readonly}>
              <ViewletContentView {_class} {viewlet} query={resultQuery} {space} {viewOptions} />
            </FileDropArea>
          </Scroller>
        {/if}
      </div>
    {/if}
  </div>
{/if}
