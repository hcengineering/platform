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
  import { Scroller, SearchInput, Panel, Button, IconMoreH } from '@hcengineering/ui'
  import view, { Viewlet, ViewOptions } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    ViewletContentView,
    ViewletSelector,
    ViewletSettingButton,
    DocAttributeBar,
    showMenu
  } from '@hcengineering/view-resources'

  import DrivePresenter from './DrivePresenter.svelte'
  import FolderHeader from './FolderHeader.svelte'
  import FileDropArea from './FileDropArea.svelte'

  export let space: Ref<Drive>
  export let parent: Ref<Folder>
  export let object: Drive | Folder | undefined = undefined
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let type: 'drive' | 'folder'

  const _class = drive.class.Resource

  $: object = type === 'drive' ? (object as Drive) : (object as Folder)
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

  const getDrive = (obj: Drive | Folder): Drive => obj as Drive
  const getFolder = (obj: Drive | Folder): Folder => obj as Folder
</script>

{#if space !== undefined && object}
  <Panel {embedded} allowClose={false} selectedAside={false}>
    <svelte:fragment slot="beforeTitle">
      <ViewletSelector bind:viewlet viewletQuery={{ attachTo: _class }} />
      <ViewletSettingButton bind:viewOptions bind:viewlet />
    </svelte:fragment>
    <svelte:fragment slot="title">
      {#if type === 'drive'}
        <DrivePresenter value={getDrive(object)} shouldShowAvatar={false} disabled noUnderline />
      {:else}
        <FolderHeader object={getFolder(object)} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="search">
      <SearchInput bind:value={search} collapsed />
      <FilterButton {_class} {space} />
    </svelte:fragment>
    <svelte:fragment slot="utils">
      <Button
        icon={IconMoreH}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        showTooltip={{ label: view.string.MoreActions, direction: 'bottom' }}
        on:click={(ev) => {
          showMenu(ev, { object })
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="aside">
      <Scroller>
        <DocAttributeBar {object} {readonly} ignoreKeys={[]} />
        <div class="space-divider bottom" />
      </Scroller>
    </svelte:fragment>

    {#if viewlet !== undefined && viewOptions}
      <FilterBar {_class} {space} query={searchQuery} {viewOptions} on:change={(e) => (resultQuery = e.detail)} />
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="popupPanel-body" on:contextmenu>
        {#if viewlet}
          <FileDropArea {space} {parent} canDrop={() => !readonly}>
            <Scroller horizontal={true}>
              <ViewletContentView {_class} {viewlet} query={resultQuery} {space} {viewOptions} />
            </Scroller>
          </FileDropArea>
        {/if}
      </div>
    {/if}
  </Panel>
{/if}
