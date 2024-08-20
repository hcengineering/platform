<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import core, { DocumentQuery } from '@hcengineering/core'
  import { Button, Breadcrumb, Scroller, SearchInput, showPopup, IconAdd, Header } from '@hcengineering/ui'
  import type { Category } from '@hcengineering/inventory'
  import inventory from '../plugin'
  import CreateCategory from './CreateCategory.svelte'
  import HierarchyView from './HierarchyView.svelte'
  // import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  let search = ''
  let resultQuery: DocumentQuery<Category> = {}

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? {} : { $search: search }
  }

  function showCreateDialog () {
    showPopup(CreateCategory, { space: core.space.Workspace }, 'top')
  }

  // $: twoRows = $deviceInfo.twoRows
</script>

<Header adaptive={'disabled'}>
  <Breadcrumb icon={inventory.icon.Categories} label={inventory.string.Categories} size={'large'} isCurrent />

  <svelte:fragment slot="search">
    <SearchInput
      bind:value={search}
      collapsed
      on:change={() => {
        updateResultQuery(search)
      }}
    />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <Button icon={IconAdd} label={inventory.string.CategoryCreateLabel} kind={'primary'} on:click={showCreateDialog} />
  </svelte:fragment>
</Header>

<Scroller>
  <HierarchyView _class={inventory.class.Category} config={['', 'modifiedOn']} options={{}} query={resultQuery} />
</Scroller>
