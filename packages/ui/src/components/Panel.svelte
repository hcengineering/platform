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
  import type { Asset } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import { AnySvelteComponent } from '../types'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import IconClose from './icons/Close.svelte'

  export let title: string | undefined = undefined
  export let subtitle: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let rightSection: boolean = false
  export let reverseCommands: boolean = false
  export let showHeader: boolean = true
  export let innerWidth: number = 0
  export let panelWidth: number = 0
  export let isSubtitle: boolean = true
  export let isProperties: boolean = true

  const dispatch = createEventDispatcher()
  let rightToTop: boolean = false
  $: rightToTop = innerWidth < 900
</script>

<div class="antiPanel antiComponent" bind:clientWidth={panelWidth}>  
  <div class:panel-content={!rightSection} class:ad-section-50={rightSection} class:divide={rightSection}>    
    {#if showHeader}
      <div class="ac-header short mirror divide highlight">
        <div class="ml-2 mr-2">
          <Button
            icon={IconClose}
            size={'medium'}
            kind={'transparent'}
            on:click={() => {
              dispatch('close')
            }} />
        </div>
        {#if $$slots['navigate-actions']}
          <div class="buttons-group xxsmall-gap">
            <slot name="navigate-actions" />
          </div>
        {/if}
        <div class="ml-4 ac-header__wrap-title flex-grow">
          {#if icon}
            <div class="ac-header__icon">
              <Icon {icon} size={'large'} />
            </div>
          {/if}
          <div class="ac-header__wrap-description">
            {#if title}<span class="ac-header__title">{title}</span>{/if}
            {#if subtitle}<span class="ac-header__description">{subtitle}</span>{/if}
          </div>
        </div>
        {#if rightSection}
          <div class="buttons-group xsmall-gap mr-4">
            <slot name="commands" />
          </div>
        {/if}
      </div>
    <!-- {:else}
      <div class="ac-header short mirror divide">
        <div class="ml-2 mr-2">
          <Button
            icon={IconClose}
            size={'medium'}
            kind={'transparent'}
            on:click={() => {
              dispatch('close')
            }}
          />
        </div>
        {#if $$slots['navigate-actions']}
          <div class="buttons-group xxsmall-gap">
            <slot name="navigate-actions" />
          </div>
        {/if}
      </div> -->
    {/if}
    <div class="main-content" class:withProperties={$$slots.properties} bind:clientWidth={innerWidth}>
      {#if $$slots.subtitle && $$slots.properties && isSubtitle}
        <div class="flex-col flex-grow clear-mins">
          <div class="ac-subtitle">
            <div class="ac-subtitle-content">
              <slot name="subtitle" />
            </div>
          </div>
          <div class="flex-col flex-grow clear-mins">
            <slot />
          </div>
        </div>
      {:else}
        <div class="flex-col flex-grow clear-mins">
          <slot />
        </div>
      {/if}
      {#if $$slots.properties && isProperties}
        <div class="properties-container">
          <slot name="properties" />
        </div>
      {/if}
    </div>
  </div>

  {#if rightSection}
    <slot name="rightSection" />
  {/if}

  <div class="ad-tools buttons-group xsmall-gap h-4" class:grow-reverse={reverseCommands}>
    {#if !rightSection && $$slots.commands}
      <slot name="commands" />
    {/if}
    <slot name="actions" />
  </div>
</div>

<style lang="scss">
  .panel-content {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    align-content: stretch;
  }
  .main-content {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    min-width: 0;
    min-height: 0;
    height: 100%;

    &.withProperties {
      flex-direction: row;
    }

    .properties-container {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      min-width: 20rem;
      width: 25%;
      border-left: 1px solid var(--divide-color);
      // background-color: var(--accent-bg-color);
    }
  }
</style>
