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
  import core, { AnyAttribute, Doc, getObjectValue, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { getClient, updateAttribute } from '@hcengineering/presentation'
  import { CheckBox, Component, deviceOptionsStore as deviceInfo, tooltip } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { FixedColumn } from '../..'
  import view from '../../plugin'
  import Circles from '../icons/Circles.svelte'

  export let docObject: Doc
  export let index: number
  export let model: AttributeModel[]
  export let groupByKey: string | undefined
  export let checked: boolean
  export let selected: boolean
  export let props: Record<string, any> = {}
  export let elementByIndex: Map<number, HTMLDivElement>
  export let indexById: Map<Ref<Doc>, number>
  export let docByIndex: Map<number, Doc>

  let elem: HTMLDivElement

  const dispatch = createEventDispatcher()

  export function getDoc () {
    return docObject
  }

  export function getElement () {
    return elem
  }

  $: compactMode = $deviceInfo.twoRows

  $: elem && elementByIndex.set(index, elem)
  $: indexById.set(docObject._id, index)
  $: docByIndex.set(index, docObject)

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
    let clearAttributeProps = attribute.props
    if (attribute.props?.listProps !== undefined) {
      const { listProps, ...other } = attribute.props as any
      clearAttributeProps = other
    }
    if (attribute.attribute?.type._class === core.class.EnumOf) {
      return { ...clearAttributeProps, type: attribute.attribute.type, ...props }
    }
    return { object, ...clearAttributeProps, ...props }
  }

  let noCompressed: number
  $: if (model) {
    noCompressed = -1
    model.forEach((m, i) => {
      if (m.props?.listProps?.compression) noCompressed = i
    })
  }
</script>

<div
  bind:this={elem}
  class="listGrid antiList__row row gap-2 flex-grow"
  class:checking={checked}
  class:mListGridSelected={selected}
  draggable={true}
  on:contextmenu
  on:focus
  on:mouseover
  on:dragover
  on:dragenter
  on:dragleave
  on:drop
  on:dragstart
>
  <div class="draggable-container">
    <div class="draggable-mark"><Circles /></div>
  </div>
  <div class="flex-center relative" use:tooltip={{ label: view.string.Select, direction: 'bottom' }}>
    <div class="antiList-cells__notifyCell">
      <div class="antiList-cells__checkCell">
        <CheckBox
          {checked}
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
  {#each model as attributeModel, i}
    {@const listProps = attributeModel.props?.listProps}
    {#if attributeModel.props?.type === 'grow'}
      <svelte:component this={attributeModel.presenter} />
    {:else if (!groupByKey || listProps?.excludeByKey !== groupByKey) && !(listProps?.optional && compactMode)}
      {#if listProps?.fixed}
        <FixedColumn key={`list_item_${attributeModel.key}`} justify={listProps.fixed}>
          <svelte:component
            this={attributeModel.presenter}
            value={getObjectValue(attributeModel.key, docObject) ?? ''}
            kind={'list'}
            onChange={getOnChange(docObject, attributeModel)}
            {...joinProps(attributeModel, docObject, props)}
          />
        </FixedColumn>
      {:else}
        <svelte:component
          this={attributeModel.presenter}
          value={getObjectValue(attributeModel.key, docObject) ?? ''}
          onChange={getOnChange(docObject, attributeModel)}
          kind={'list'}
          compression={listProps?.compression && i !== noCompressed}
          {...joinProps(attributeModel, docObject, props)}
        />
      {/if}
    {/if}
  {/each}
  {#if compactMode}
    <div class="panel-trigger" tabindex="-1">
      <Circles />
      <div class="space" />
      <Circles />
    </div>
    <div class="hidden-panel" tabindex="-1">
      <div class="header">
        <Circles />
        <div class="space" />
        <Circles />
      </div>
      <div class="scroll-box gap-2">
        {#each model as attributeModel}
          {@const listProps = attributeModel.props?.listProps}
          {@const value = getObjectValue(attributeModel.key, docObject)}
          {#if listProps?.optional && listProps?.excludeByKey !== groupByKey && value !== undefined}
            <svelte:component
              this={attributeModel.presenter}
              value={getObjectValue(attributeModel.key, docObject) ?? ''}
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
  .row:not(:last-child) {
    border-bottom: 1px solid var(--accent-bg-color);
  }

  .listGrid {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 0.75rem 0 0.875rem;
    width: 100%;
    height: 2.75rem;
    min-height: 2.75rem;
    color: var(--caption-color);

    &.checking {
      background-color: var(--highlight-select);
      border-bottom-color: var(--highlight-select);

      &:hover {
        background-color: var(--highlight-select-hover);
        border-bottom-color: var(--highlight-select-hover);
      }
    }

    &.mListGridSelected {
      background-color: var(--highlight-hover);
    }

    .draggable-container {
      position: absolute;
      left: 0;
      display: flex;
      align-items: center;
      height: 100%;
      width: 1.5rem;
      cursor: grabbing;

      .draggable-mark {
        opacity: 0;
        width: 0.375rem;
        height: 1rem;
        margin-left: 0.75rem;
        transition: opacity 0.1s;
      }
    }
    &:hover {
      .draggable-mark {
        opacity: 0.4;
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
      background-color: var(--accent-bg-color);
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
        overflow: auto visible;
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
      right: 2.5rem;
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
