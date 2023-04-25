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
  import { Doc, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import ui, {
    ActionIcon,
    AnyComponent,
    Button,
    IconAdd,
    IconCollapseArrow,
    IconMoreH,
    Label,
    deviceOptionsStore as deviceInfo,
    eventToHTMLElement,
    hslToRgb,
    rgbToHsl,
    showPopup
  } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'
  import { noCategory } from '../../viewOptions'

  export let groupByKey: string
  export let category: any
  export let headerComponent: AttributeModel | undefined
  export let space: Ref<Space> | undefined
  export let limited: number
  export let items: Doc[]
  export let flat = false
  export let collapsed = false
  export let lastCat = false
  export let level: number

  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString | undefined
  export let extraHeaders: AnyComponent[] | undefined
  export let props: Record<string, any> = {}
  export let newObjectProps: (doc: Doc) => Record<string, any> | undefined

  const dispatch = createEventDispatcher()

  $: lth = $deviceInfo.theme === 'theme-light'

  let accentColor = { h: 0, s: 0, l: 65 }

  $: headerBGColor = !lth
    ? hslToRgb(accentColor.h, accentColor.s, accentColor.l / 1.5 + (mouseOver ? -20 : 0))
    : hslToRgb(accentColor.h, accentColor.s, accentColor.l * 1.5 + (mouseOver ? -20 : 0))

  const handleCreateItem = (event: MouseEvent) => {
    if (createItemDialog === undefined) return
    showPopup(createItemDialog, newObjectProps(items[0]), eventToHTMLElement(event))
  }
  let mouseOver = false
</script>

{#if headerComponent || groupByKey === noCategory}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    style:z-index={10 - level}
    style:--list-header-rgb-color={`${headerBGColor.r}, ${headerBGColor.g}, ${headerBGColor.b}`}
    class="flex-between categoryHeader row"
    class:gradient={!lth}
    class:flat
    class:collapsed
    class:subLevel={level !== 0}
    class:lastCat
    on:focus={() => {
      mouseOver = true
    }}
    on:mouseenter={() => {
      mouseOver = true
    }}
    on:mouseover={() => {
      mouseOver = true
    }}
    on:mouseleave={() => {
      mouseOver = false
    }}
    on:click={() => dispatch('collapse')}
  >
    <div class="flex-row-center clear-mins">
      {#if level === 0}
        <div class="chevron"><IconCollapseArrow size={'small'} /></div>
      {/if}
      {#if groupByKey === noCategory}
        <span class="text-base fs-bold overflow-label pointer-events-none">
          <Label label={view.string.NoGrouping} />
        </span>
      {:else if headerComponent}
        <span class="clear-mins">
          <svelte:component
            this={headerComponent.presenter}
            value={category}
            {space}
            size={'small'}
            kind={'list-header'}
            colorInherit={lth && level === 0}
            accent={level === 0}
            on:accent-color={(evt) => {
              accentColor = rgbToHsl(evt.detail.r, evt.detail.g, evt.detail.b)
            }}
          />
        </span>
      {/if}
      {#if limited < items.length}
        <div class="antiSection-header__counter flex-row-center mx-2">
          <span class="caption-color">{limited}</span>
          <span class="text-xs mx-0-5">/</span>
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
        <span class="antiSection-header__counter ml-2">{items.length}</span>
      {/if}
    </div>
    {#if createItemDialog !== undefined && createItemLabel !== undefined}
      <div class:on-hover={!mouseOver}>
        <Button
          icon={IconAdd}
          kind={'transparent'}
          showTooltip={{ label: createItemLabel }}
          on:click={handleCreateItem}
        />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .categoryHeader {
    position: relative;
    position: sticky;
    top: 0;
    padding: 0 0.75rem 0 0.75rem;
    height: 2.75rem;
    min-height: 2.75rem;
    min-width: 0;
    background: var(--theme-bg-color);

    .on-hover {
      visibility: hidden;
    }

    .chevron {
      flex-shrink: 0;
      min-width: 0;
      margin-right: 0.75rem;
      color: var(--theme-caption-color);
      transform-origin: center;
      transform: rotate(90deg);
      transition: transform 0.15s ease-in-out;
    }
    &:not(.gradient)::before {
      background: rgba(var(--list-header-rgb-color), 0.15);
    }
    &.gradient::before {
      background: linear-gradient(
        90deg,
        rgba(var(--list-header-rgb-color), 0.15),
        rgba(var(--list-header-rgb-color), 0.05)
      );
    }
    &::before {
      box-sizing: border-box;
      position: absolute;
      content: '';
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 1px solid var(--theme-list-border-color);
      border-bottom-color: transparent;
      border-radius: 0.25rem 0.25rem 0 0;
      z-index: -1;
    }

    /* Global styles in components.scss and there is an influence from the Scroller component */
    &.collapsed {
      .chevron {
        transform: rotate(0deg);
      }
      &::before {
        border-bottom-color: var(--theme-list-border-color);
        border-radius: 0.25rem;
      }
    }
    &.subLevel {
      top: 2.75rem;
      padding: 0 2.5rem;
      background: var(--theme-list-subheader-color);
      border-left: 1px solid var(--theme-list-border-color);
      border-right: 1px solid var(--theme-list-border-color);
      border-bottom: 1px solid var(--theme-list-subheader-divider);
      // here should be top 3rem for sticky, but with ExpandCollapse it gives strange behavior

      &::before {
        content: none;
      }
      &.collapsed.lastCat {
        border-bottom: 1px solid var(--theme-list-border-color);
        border-radius: 0 0 0.25rem 0.25rem;
      }
    }

    &.flat {
      background: var(--header-bg-color);
      background-blend-mode: darken;
      min-height: 2.25rem;
      height: 2.25rem;
      padding: 0 0.25rem 0 0.25rem;
    }
  }
</style>
