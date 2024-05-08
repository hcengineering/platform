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
  import { createEventDispatcher } from 'svelte'
  import type { IntlString } from '@hcengineering/platform'
  import type { AnyComponent } from '..'
  import { showPopup, Menu, Action, Label, Component, IconOpenedArrow } from '..'

  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let categoryName: string
  export let tools: AnyComponent | undefined = undefined
  export let isOpen: boolean = true
  export let isFold: boolean = false
  export let selected: boolean = false
  export let second: boolean = false
  export let actions: Action[] = []

  const dispatch = createEventDispatcher()

  $: id = `navGroup-${categoryName}`

  const toggle = (): void => {
    isOpen = !isOpen
    dispatch('toggle', isOpen)
  }

  function handleMenuClicked (ev: MouseEvent): void {
    if (actions.length === 0) return
    showPopup(Menu, { actions }, ev.target as HTMLElement)
  }
</script>

<div class="hulyAccordionItem-container" class:second>
  <button class="hulyAccordionItem-header nav small" class:isOpen class:selected on:click={toggle}>
    {#if isFold}
      <button class="hulyAccordionItem-header__chevron" class:collapsed={!isOpen}>
        <IconOpenedArrow size={'small'} />
      </button>
    {/if}
    <div class="hulyAccordionItem-header__label-wrapper font-medium-12">
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <span
        class="hulyAccordionItem-header__label"
        class:cursor-default={actions.length === 0}
        on:click|stopPropagation={handleMenuClicked}
      >
        {#if label}<Label {label} />{/if}
        {#if title}{title}{/if}
      </span>
    </div>
    {#if isFold}<div class="flex-grow" />{/if}
    {#if tools || $$slots.tools}
      <div class="hulyAccordionItem-header__tools">
        {#if tools}
          <Component
            is={tools}
            props={{
              kind: 'tools',
              categoryName
            }}
          />
        {/if}
        <slot name="tools" />
      </div>
    {/if}
  </button>
  <div {id} class="hulyAccordionItem-content">
    <slot />
  </div>
</div>
