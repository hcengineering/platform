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
  import core, { AnyAttribute, Doc, getObjectValue } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { getClient, updateAttribute } from '@hcengineering/presentation'
  import { CheckBox, Component, deviceOptionsStore as deviceInfo, IconCircles, tooltip } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import { FixedColumn } from '../..'
  import view from '../../plugin'
  import GrowPresenter from './GrowPresenter.svelte'
  import DividerPresenter from './DividerPresenter.svelte'

  export let docObject: Doc
  export let model: AttributeModel[]
  export let groupByKey: string | undefined
  export let checked: boolean
  export let selected: boolean
  export let last: boolean = false
  export let lastCat: boolean = false
  export let props: Record<string, any> = {}

  export function scroll () {
    elem?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  }

  let elem: HTMLDivElement

  const dispatch = createEventDispatcher()

  export function getDoc () {
    return docObject
  }

  export function getElement () {
    return elem
  }

  $: compactMode = $deviceInfo.twoRows

  const client = getClient()

  function onChange (value: any, doc: Doc, key: string, attribute: AnyAttribute) {
    updateAttribute(client, doc, doc._class, { key, attr: attribute }, value)
  }

  function getOnChange (docObject: Doc, attribute: AttributeModel) {
    const attr = attribute.attribute
    if (attr === undefined) return
    if (attribute.collectionAttr) return
    if (attribute.isLookup) return
    return (value: any) => onChange(value, docObject, attribute.key, attr)
  }

  function joinProps (attribute: AttributeModel, object: Doc, props: Record<string, any>) {
    const clearAttributeProps = attribute.props
    if (attribute.attribute?.type._class === core.class.EnumOf) {
      return { ...clearAttributeProps, type: attribute.attribute.type, ...props }
    }
    return { object, ...clearAttributeProps, ...props }
  }

  let noCompressed: number
  $: if (model) {
    noCompressed = -1
    model.forEach((m, i) => {
      if (m.displayProps?.compression) noCompressed = i
    })
  }
  onMount(() => {
    dispatch('on-mount')
  })

  $: growBefore = Math.ceil(model.filter((p) => p.displayProps?.optional !== true).length / 2)
</script>

<div
  bind:this={elem}
  class="listGrid antiList__row row gap-2 flex-grow"
  class:compactMode
  class:checking={checked}
  class:mListGridSelected={selected}
  class:last
  class:lastCat
  draggable={true}
  on:contextmenu
  on:focus
  on:mouseenter
  on:mouseover
  on:dragover
  on:dragenter
  on:dragleave
  on:drop
  on:dragstart
>
  <div class="draggable-container">
    <div class="draggable-mark">
      <IconCircles />
      <div class="space" />
      <IconCircles />
    </div>
  </div>
  <div class="flex-center relative mr-1" use:tooltip={{ label: view.string.Select, direction: 'bottom' }}>
    <div class="antiList-cells__notifyCell">
      <div class="antiList-cells__checkCell">
        <CheckBox
          {checked}
          size={'medium'}
          on:value={(event) => {
            dispatch('check', { docs: [docObject], value: event.detail })
          }}
        />
      </div>
      <Component
        is={notification.component.NotificationPresenter}
        showLoading={false}
        props={{ value: docObject, kind: 'table' }}
      />
    </div>
  </div>
  {#each model.filter((p) => !p.displayProps?.optional) as attributeModel, i}
    {@const displayProps = attributeModel.displayProps}
    {#if !groupByKey || displayProps?.excludeByKey !== groupByKey}
      {#if !(compactMode && displayProps?.compression)}
        {#if i === growBefore}
          <GrowPresenter />
          {#each model.filter((p) => p.displayProps?.optional) as attributeModel, i}
            {@const dp = attributeModel.displayProps}
            {#if dp?.dividerBefore === true}
              <DividerPresenter />
            {/if}
            {#if dp?.fixed}
              <FixedColumn key={`list_item_${dp.key}`} justify={dp.fixed}>
                <svelte:component
                  this={attributeModel.presenter}
                  value={getObjectValue(attributeModel.key, docObject)}
                  kind={'list'}
                  onChange={getOnChange(docObject, attributeModel)}
                  {...joinProps(attributeModel, docObject, props)}
                />
              </FixedColumn>
            {:else}
              <svelte:component
                this={attributeModel.presenter}
                value={getObjectValue(attributeModel.key, docObject)}
                onChange={getOnChange(docObject, attributeModel)}
                kind={'list'}
                compression={dp?.compression && i !== noCompressed}
                {...joinProps(attributeModel, docObject, props)}
              />
            {/if}
          {/each}
        {/if}
        {#if i !== 0 && displayProps?.dividerBefore === true}
          <DividerPresenter />
        {/if}
        {#if displayProps?.fixed}
          <FixedColumn key={`list_item_${displayProps.key}`} justify={displayProps.fixed}>
            <svelte:component
              this={attributeModel.presenter}
              value={getObjectValue(attributeModel.key, docObject)}
              kind={'list'}
              onChange={getOnChange(docObject, attributeModel)}
              {...joinProps(attributeModel, docObject, props)}
            />
          </FixedColumn>
        {:else}
          <svelte:component
            this={attributeModel.presenter}
            value={getObjectValue(attributeModel.key, docObject)}
            onChange={getOnChange(docObject, attributeModel)}
            kind={'list'}
            compression={displayProps?.compression && i !== noCompressed}
            {...joinProps(attributeModel, docObject, props)}
          />
        {/if}
      {/if}
    {/if}
  {/each}
  {#if compactMode}
    <div class="panel-trigger" tabindex="-1">
      <IconCircles />
      <div class="space" />
      <IconCircles />
    </div>
    <div class="hidden-panel" tabindex="-1">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="header" on:click={(ev) => ev.currentTarget.blur()}>
        <IconCircles />
        <div class="space" />
        <IconCircles />
      </div>
      <div class="scroll-box gap-2">
        {#each model.filter((m) => m.displayProps?.optional || m.displayProps?.compression) as attributeModel, j}
          {@const displayProps = attributeModel.displayProps}
          {@const value = getObjectValue(attributeModel.key, docObject)}
          {#if displayProps?.excludeByKey !== groupByKey && value !== undefined}
            {#if j !== 0 && displayProps?.dividerBefore === true}
              <DividerPresenter />
            {/if}
            <svelte:component
              this={attributeModel.presenter}
              value={getObjectValue(attributeModel.key, docObject)}
              onChange={getOnChange(docObject, attributeModel)}
              kind={'list'}
              {...joinProps(attributeModel, docObject, props)}
            />
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .row {
    border-left: 1px solid var(--theme-list-border-color);
    border-right: 1px solid var(--theme-list-border-color);
  }
  .row:not(.lastCat, .last) {
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .row.last {
    border-bottom: 1px solid var(--theme-list-subheader-divider);
  }
  .row.lastCat {
    border-radius: 0 0 0.25rem 0.25rem;
    border-bottom: 1px solid var(--theme-list-border-color);
  }

  /* Global styles in components.scss */
  .listGrid {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 2.5rem 0 0.25rem;
    width: 100%;
    height: 2.75rem;
    min-height: 2.75rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-list-row-color);

    &.compactMode {
      padding: 0 1.125rem 0 0.25rem;
    }
    &.mListGridSelected {
      background-color: var(--highlight-hover);
    }

    &.checking {
      background-color: var(--highlight-select);
      // border-bottom-color: var(--highlight-select);

      &:hover {
        background-color: var(--highlight-select-hover);
        // border-bottom-color: var(--highlight-select-hover);
      }
    }

    .draggable-container {
      position: absolute;
      left: 0;
      display: flex;
      align-items: center;
      height: 100%;
      width: 1rem;
      cursor: grabbing;

      .draggable-mark {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin-left: 0.125rem;
        width: 0.375rem;
        height: 100%;
        opacity: 0;
      }
    }
    &:hover {
      .draggable-mark {
        opacity: 0.1;
      }
    }

    .hidden-panel,
    .panel-trigger {
      position: absolute;
      display: flex;
      align-items: center;
      top: 0;
      bottom: 0;
      height: 100%;
    }
    .hidden-panel {
      overflow: hidden;
      right: 0;
      width: 80%;
      background-color: var(--theme-comp-header-color);
      opacity: 0;
      pointer-events: none;
      z-index: 2;
      transition-property: opacity, width;
      transition-duration: 0.15s;
      transition-timing-function: var(--timing-main);

      .header {
        display: flex;
        flex-direction: column;
        justify-content: center;
        margin: 0 0.25rem;
        width: 0.375rem;
        min-width: 0.375rem;
        height: 100%;
        opacity: 0.25;
      }
      .scroll-box {
        overflow-x: auto;
        overflow-y: visible;
        display: flex;
        align-items: center;
        margin: 0.125rem 0.25rem 0;
        padding: 0.25rem 0.25rem;
        min-width: 0;

        &::-webkit-scrollbar:horizontal {
          height: 3px;
        }
      }
    }
    .panel-trigger {
      flex-direction: column;
      justify-content: center;
      padding: 0 0.125rem;
      right: 0.125rem;
      width: 0.75rem;
      border: 1px solid transparent;
      border-radius: 0.25rem;
      opacity: 0.1;
      z-index: 1;
      transition: opacity 0.15s var(--timing-main);

      &:focus {
        border-color: var(--primary-edit-border-color);
        opacity: 0.25;
      }
      & > * {
        pointer-events: none;
      }
    }
    .hidden-panel:focus-within,
    .hidden-panel:focus,
    .panel-trigger:focus + .hidden-panel {
      width: 100%;
      opacity: 1;
      pointer-events: all;
    }
    .space {
      min-height: 0.1075rem;
    }
  }
</style>
