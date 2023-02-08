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
  import { IntlString } from '@hcengineering/platform'
  import ui, {
    ActionIcon,
    AnyComponent,
    Button,
    Component,
    eventToHTMLElement,
    IconAdd,
    IconMoreH,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { noCategory } from '../../viewOptions'
  import FixedColumn from '../FixedColumn.svelte'
  import view from '../../plugin'
  import { Doc, Ref, Space } from '@hcengineering/core'
  import { AttributeModel } from '@hcengineering/view'

  export let groupByKey: string
  export let category: any
  export let headerComponent: AttributeModel | undefined
  export let space: Ref<Space> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString | undefined
  export let limited: number
  export let items: Doc[]
  export let extraHeaders: AnyComponent[] | undefined
  export let flat = false
  export let props: Record<string, any> = {}
  export let level: number
  export let newObjectProps: Record<string, any>

  const dispatch = createEventDispatcher()

  const handleCreateItem = (event: MouseEvent) => {
    if (createItemDialog === undefined) return
    showPopup(createItemDialog, newObjectProps, eventToHTMLElement(event))
  }
</script>

{#if headerComponent || groupByKey === noCategory}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="flex-between categoryHeader row"
    style:z-index={10 - level}
    class:flat
    class:subLevel={level !== 0}
    on:click={() => dispatch('collapse')}
  >
    <div class="flex-row-center gap-2 clear-mins caption-color">
      <FixedColumn key={`list_groupBy_${groupByKey}`} justify={'left'}>
        {#if groupByKey === noCategory}
          <span class="text-base fs-bold overflow-label content-accent-color pointer-events-none">
            <Label label={view.string.NoGrouping} />
          </span>
        {:else if headerComponent}
          <svelte:component this={headerComponent.presenter} value={category} {space} kind={'list-header'} />
        {/if}
      </FixedColumn>
      {#if extraHeaders}
        {#each extraHeaders as extra}
          <FixedColumn key={`list_groupBy_${groupByKey}_extra_${extra}`} justify={'left'}>
            <Component is={extra} props={{ ...props, value: category, docs: items }} />
          </FixedColumn>
        {/each}
      {/if}
      {#if limited < items.length}
        <div class="antiSection-header__counter ml-4">
          {limited}
          <div class="text-xs mx-1">/</div>
          {items.length}
        </div>
        <ActionIcon
          size={'small'}
          icon={IconMoreH}
          label={ui.string.ShowMore}
          action={() => {
            dispatch('more')
          }}
        />
      {:else}
        <span class="antiSection-header__counter ml-4">{items.length}</span>
      {/if}
    </div>
    {#if createItemDialog !== undefined && createItemLabel !== undefined}
      <Button
        icon={IconAdd}
        kind={'transparent'}
        showTooltip={{ label: createItemLabel }}
        on:click={handleCreateItem}
      />
    {/if}
  </div>
{/if}

<style lang="scss">
  .categoryHeader {
    position: sticky;
    top: 0;
    padding: 0 0.75rem 0 2.25rem;
    height: 3rem;
    min-height: 3rem;
    min-width: 0;
    background: var(--header-bg-color);

    &.subLevel {
      min-height: 2.25rem;
      height: 2.25rem;
      padding: 0 0.75rem 0 2.25rem;
      // here shoul be top 3rem for sticky, but with ExpandCollapse it gives strange behavior
    }

    &.flat {
      background: var(--header-bg-color);
      background-blend-mode: darken;
      min-height: 2.25rem;
      height: 2.25rem;
      padding: 0 0.25rem 0 0.25rem;
    }
  }

  .row:not(:last-child) {
    border-bottom: 1px solid var(--accent-bg-color);
  }
</style>
