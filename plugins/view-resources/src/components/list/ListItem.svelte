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
  import { AnyAttribute, Doc, getObjectValue } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { getClient, updateAttribute } from '@hcengineering/presentation'
  import { CheckBox, Component, IconCircles, tooltip, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import view from '../../plugin'
  import GrowPresenter from './GrowPresenter.svelte'
  import ListPresenter from './ListPresenter.svelte'
  import { restrictionStore } from '../../utils'

  export let docObject: Doc
  export let model: AttributeModel[]
  export let groupByKey: string | undefined
  export let checked: boolean
  export let selected: boolean
  export let last: boolean = false
  export let lastCat: boolean = false
  export let props: Record<string, any> = {}
  export let compactMode: boolean = false

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

  const client = getClient()

  function onChange (value: any, doc: Doc, key: string, attribute: AnyAttribute) {
    updateAttribute(client, doc, doc._class, { key, attr: attribute }, value)
  }

  function getOnChange (docObject: Doc, attribute: AttributeModel) {
    const attr = attribute.attribute
    if (attr === undefined) return
    if (attribute.collectionAttr) return
    if (attribute.isLookup) return
    return (value: any) => {
      onChange(value, docObject, attribute.key, attr)
    }
  }

  function getProps (props: Record<string, any>, readonly: boolean): Record<string, any> {
    if (readonly) {
      return {
        ...props,
        readonly: true,
        disabled: true,
        editable: false,
        isEditable: false
      }
    }
    return props
  }

  $: mobile = $deviceInfo.isMobile
  $: needCompact =
    model.filter((m) => m.displayProps?.optional || m.displayProps?.compression || m.displayProps?.suffix).length > 0

  onMount(() => {
    dispatch('on-mount')
  })
  let minWidth: number | undefined = undefined
  const sizes = new Map<number, number>()
  const calcSizes = (): void => {
    minWidth = sizes.size > 0 ? Array.from(sizes.values()).reduce((a, b) => a + b, 0) : undefined
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
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
      <IconCircles size={'small'} />
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
  {#each model.filter((p) => !(p.displayProps?.optional === true || p.displayProps?.compression === true || p.displayProps?.suffix === true)) as attributeModel, i}
    {@const displayProps = attributeModel.displayProps}
    {#if !groupByKey || displayProps?.excludeByKey !== groupByKey}
      {#if displayProps?.grow}
        {#if !(compactMode && mobile)}
          {#each model.filter((p) => p.displayProps?.suffix === true) as attrModel}
            <ListPresenter
              {docObject}
              attributeModel={attrModel}
              props={getProps(props, $restrictionStore.readonly)}
              {compactMode}
              value={getObjectValue(attrModel.key, docObject)}
              onChange={getOnChange(docObject, attrModel)}
            />
          {/each}
        {/if}
        <GrowPresenter />
        {#if !compactMode}
          <div class="compression-bar" style:min-width={`${minWidth}px`}>
            {#each model.filter((p) => p.displayProps?.compression === true) as attrModel, index}
              <ListPresenter
                {docObject}
                attributeModel={attrModel}
                props={getProps(props, $restrictionStore.readonly)}
                value={getObjectValue(attrModel.key, docObject)}
                onChange={getOnChange(docObject, attrModel)}
                on:resize={(e) => {
                  if (e.detail == null) return
                  sizes.set(index, e.detail)
                  calcSizes()
                }}
              />
            {/each}
          </div>
          {#each model.filter((p) => p.displayProps?.optional === true) as attrModel}
            <ListPresenter
              {docObject}
              attributeModel={attrModel}
              props={getProps(props, $restrictionStore.readonly)}
              value={getObjectValue(attrModel.key, docObject)}
              onChange={getOnChange(docObject, attrModel)}
            />
          {/each}
        {/if}
      {:else}
        <ListPresenter
          {docObject}
          {attributeModel}
          props={getProps(props, $restrictionStore.readonly)}
          value={getObjectValue(attributeModel.key, docObject)}
          onChange={getOnChange(docObject, attributeModel)}
          hideDivider={i === 0}
          {compactMode}
        />
      {/if}
    {/if}
  {/each}
  {#if compactMode && needCompact}
    <div class="panel-trigger" tabindex="-1">
      <IconCircles size={'small'} />
    </div>
    <div class="hidden-panel" tabindex="-1">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="header"
        on:click={(ev) => {
          ev.currentTarget.blur()
        }}
      >
        <IconCircles size={'small'} />
      </div>
      <div class="scroll-box gap-2">
        {#if mobile}
          {#each model.filter((p) => p.displayProps?.suffix === true) as attrModel}
            <ListPresenter
              {docObject}
              attributeModel={attrModel}
              props={getProps(props, $restrictionStore.readonly)}
              {compactMode}
              value={getObjectValue(attrModel.key, docObject)}
              onChange={getOnChange(docObject, attrModel)}
            />
          {/each}
        {/if}
        <div class="compression-bar">
          {#each model.filter((m) => m.displayProps?.compression) as attributeModel, j}
            {@const displayProps = attributeModel.displayProps}
            {@const value = getObjectValue(attributeModel.key, docObject)}
            {#if displayProps?.excludeByKey !== groupByKey && value !== undefined}
              <ListPresenter
                {docObject}
                {attributeModel}
                props={getProps(props, $restrictionStore.readonly)}
                value={getObjectValue(attributeModel.key, docObject)}
                onChange={getOnChange(docObject, attributeModel)}
                hideDivider={j === 0}
              />
            {/if}
          {/each}
        </div>
        {#each model.filter((m) => m.displayProps?.optional) as attributeModel, j}
          {#if j === 0}
            <GrowPresenter />
          {/if}
          {@const displayProps = attributeModel.displayProps}
          {@const value = getObjectValue(attributeModel.key, docObject)}
          {#if displayProps?.excludeByKey !== groupByKey && value !== undefined}
            <ListPresenter
              {docObject}
              {attributeModel}
              props={getProps(props, $restrictionStore.readonly)}
              value={getObjectValue(attributeModel.key, docObject)}
              onChange={getOnChange(docObject, attributeModel)}
            />
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<!--
<style lang="scss">
  /* Global styles in components.scss */
</style>
-->
