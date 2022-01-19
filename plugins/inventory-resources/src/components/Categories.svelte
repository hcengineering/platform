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
  import { Doc, DocumentQuery } from '@anticrm/core'
  import { Button, Icon, Label, ScrollBox, SearchEdit, showPopup } from '@anticrm/ui'
  import inventory from '../plugin'
  import CreateCategory from './CreateCategory.svelte'
  import HierarchyView from './HierarchyView.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}

  function updateResultQuery (search: string): void {
    resultQuery = (search === '') ? { } : { $search: search }
  }

  function showCreateDialog (ev: Event) {
    showPopup(CreateCategory, { space: inventory.space.Category }, ev.target as HTMLElement)
  }
</script>

<div class="categories-header-container">
  <div class="header-container">
    <div class="flex-row-center">
      <span class="icon"><Icon icon={inventory.icon.Categories} size={'small'} /></span>
      <span class="label"><Label label={inventory.string.Categories} /></span>
    </div>
  </div>

  <SearchEdit bind:value={search} on:change={() => {
    updateResultQuery(search)
  }}/>
  <Button
    label={inventory.string.CreateCategoryShort}
    primary={true}
    size={'small'}
    on:click={(ev) => showCreateDialog(ev)}
  />
</div>

<div class="container">
  <div class="panel-component">
    <ScrollBox vertical stretch noShift>
      <HierarchyView _class={inventory.class.Category} config={['', 'modifiedOn']} options={{}} query={resultQuery} />
    </ScrollBox>
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    height: 100%;
    padding-bottom: 1.25rem;

    .panel-component {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      margin-right: 1rem;
      height: 100%;
      border-radius: 1.25rem;
      background-color: var(--theme-bg-color);
      overflow: hidden;
    }
  }
  .categories-header-container {
    display: grid;
    grid-template-columns: auto;
    grid-auto-flow: column;
    grid-auto-columns: min-content;
    gap: 0.75rem;
    align-items: center;
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;
    white-space: nowrap;

    .header-container {
      display: flex;
      flex-direction: column;
      flex-grow: 1;

      .icon {
        margin-right: 0.5rem;
        opacity: 0.6;
      }
      .label {
        flex-grow: 1;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        max-width: 35rem;
      }
      .label {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }
    }
  }
</style>
