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
  import { DocumentQuery } from '@anticrm/core'
  import { Button, Icon, Label, Scroller, SearchEdit, showPopup, IconAdd, eventToHTMLElement } from '@anticrm/ui'
  import type { Category } from '@anticrm/inventory'
  import inventory from '../plugin'
  import CreateCategory from './CreateCategory.svelte'
  import HierarchyView from './HierarchyView.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Category> = {}

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? {} : { $search: search }
  }

  function showCreateDialog (ev: MouseEvent) {
    showPopup(CreateCategory, { space: inventory.space.Category }, eventToHTMLElement(ev))
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={inventory.icon.Categories} size={'small'} /></div>
    <span class="ac-header__title"><Label label={inventory.string.Categories} /></span>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
  <Button
    label={inventory.string.CategoryCreateLabel}
    icon={IconAdd}
    kind={'primary'}
    on:click={(ev) => showCreateDialog(ev)}
  />
</div>

<Scroller>
  <HierarchyView _class={inventory.class.Category} config={['', 'modifiedOn']} options={{}} query={resultQuery} />
</Scroller>
