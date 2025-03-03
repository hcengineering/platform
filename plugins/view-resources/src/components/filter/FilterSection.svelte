<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { Class, Doc, Ref, RefTo, Space, Status } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Component,
    eventToHTMLElement,
    Icon,
    IconClose,
    Label,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { Filter, FilterMode } from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import view from '../../plugin'
  import ModeSelector from './ModeSelector.svelte'

  export let filter: Filter
  export let space: Ref<Space> | undefined

  let currentFilter = filter.nested ? filter.nested : filter
  $: currentFilter = filter.nested ? filter.nested : filter

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getTargetClass (): Ref<Class<Doc>> | undefined {
    try {
      return (hierarchy.getAttribute(currentFilter.key._class, currentFilter.key.key).type as RefTo<Doc>).to
    } catch (err: any) {
      console.error(err)
    }
  }
  const targetClass = getTargetClass()
  $: isState = targetClass === core.class.Status
  const dispatch = createEventDispatcher()

  async function getCountStates (ids: Array<Ref<Doc>>): Promise<number> {
    if (targetClass === undefined) {
      return 0
    }
    const selectStates = await client.findAll(targetClass, { _id: { $in: Array.from(ids) } }, {})
    const unique = new Set(selectStates.map((s) => (s as Status).name))
    return unique.size
  }

  let countLabel: string = ''
  async function getLabel (): Promise<void> {
    const count = isState ? await getCountStates(currentFilter.value) : currentFilter.value.length
    countLabel = await translate(view.string.FilterStatesCount, { value: count }, $themeStore.language)
  }

  let valueComponent: AnyComponent | undefined
  $: if (filter) getLabel()
  $: getValueComponent(currentFilter)

  async function getValueComponent (filter: Filter): Promise<void> {
    const presenterClass = getAttributePresenterClass(hierarchy, filter.key.attribute)
    const presenterMixin = hierarchy.classHierarchyMixin(presenterClass.attrClass, view.mixin.AttributeFilterPresenter)
    valueComponent = presenterMixin?.presenter
  }

  async function getMode (mode: Ref<FilterMode>): Promise<FilterMode | undefined> {
    return await client.findOne(view.class.FilterMode, { _id: mode })
  }

  function onChange (e: Filter) {
    if (filter.nested !== undefined) {
      filter.nested = e
    } else {
      filter = e
    }
    dispatch('change')
  }

  onDestroy(() => {
    filter.nested?.onRemove?.()
    filter.onRemove?.()
  })

  $: modeValuePromise = getMode(filter.mode)
  $: nestedModeValuePromise = filter.nested ? getMode(filter.nested.mode) : undefined

  function clickHandler (e: MouseEvent, nested: boolean) {
    const curr = nested && filter.nested ? filter.nested : filter
    showPopup(ModeSelector, { filter: curr }, eventToHTMLElement(e), (res) => {
      if (res) {
        if (nested && filter.nested) {
          filter.nested.mode = res
        } else {
          filter.mode = res
        }
        dispatch('change')
      }
    })
  }
</script>

<div class="filter-section">
  <button class="filter-button left-round">
    <span><Label label={filter.key.label} /></span>
  </button>
  <button
    class="filter-button hoverable lower"
    data-id="btnCondition"
    on:click={(e) => {
      clickHandler(e, false)
    }}
  >
    {#await modeValuePromise then mode}
      {#if mode?.label}
        <span><Label label={mode.selectedLabel ?? mode.label} params={{ value: filter.value.length }} /></span>
      {/if}
    {/await}
  </button>
  {#if filter.nested}
    <button class="filter-button hoverable">
      <span><Label label={filter.nested.key.label} /></span>
    </button>
    <button
      class="filter-button hoverable lower"
      on:click={(e) => {
        clickHandler(e, true)
      }}
    >
      {#if nestedModeValuePromise}
        {#await nestedModeValuePromise then mode}
          {#if mode?.label}
            <span><Label label={mode.selectedLabel ?? mode.label} params={{ value: filter.value.length }} /></span>
          {/if}
        {/await}
      {/if}
    </button>
  {/if}
  {#await modeValuePromise then mode}
    {#if !(mode?.disableValueSelector ?? false)}
      <button
        class="filter-button hoverable"
        on:click={(e) => {
          showPopup(
            currentFilter.key.component,
            {
              _class: currentFilter.key._class,
              filter: currentFilter,
              space,
              onChange
            },
            eventToHTMLElement(e)
          )
        }}
      >
        {#if valueComponent}
          <Component
            is={valueComponent}
            props={{ value: currentFilter.value, onChange, filter: currentFilter, space }}
          />
        {:else}
          <span>{countLabel}</span>
        {/if}
      </button>
    {/if}
  {/await}
  <div class="divider" />
  <button
    class="filter-button square hoverable"
    on:click={() => {
      dispatch('remove')
    }}
  >
    <div class="btn-icon"><Icon icon={IconClose} size={'small'} /></div>
  </button>
</div>

<style lang="scss">
  .filter-section {
    display: flex;
    align-items: center;
    margin-bottom: 0.375rem;
    background-color: var(--theme-button-default);
    padding: 0.125rem;
    border-radius: 0.25rem;

    &:not(:last-child) {
      margin-right: 0.375rem;
    }

    &:hover {
      .divider {
        visibility: hidden;
      }
    }
  }

  .filter-button {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.375rem;
    height: 1.75rem;
    min-width: 1.75rem;
    white-space: nowrap;
    color: var(--theme-content-color);
    border: 1px solid transparent;
    border-radius: 0.25rem;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    &.square {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
      width: 1.75rem;
    }
    &.left-round {
      padding-left: 0.5rem;
    }
    .btn-icon {
      color: var(--theme-halfcontent-color);
      transition: color 0.15s;
      pointer-events: none;
    }
    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 10rem;
    }
    &.hoverable:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-button-hovered);

      .btn-icon {
        color: var(--theme-caption-color);
      }
    }
  }
  .divider {
    flex-shrink: 0;
    width: 1px;
    height: 1.5rem;
    background-color: var(--theme-refinput-divider);
  }
</style>
