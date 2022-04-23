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
  import ActionIcon from './ActionIcon.svelte'
  import Icon from './Icon.svelte'
  import IconClose from './icons/Close.svelte'

  export let title: string | undefined = undefined
  export let subtitle: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let rightSection: boolean = false
  export let reverseCommands = false
  export let showHeader = true
  export let innerWidth: number = 0

  const dispatch = createEventDispatcher()

</script>

<div class="antiPanel antiComponent" bind:clientWidth={innerWidth}>  
  <div class:panel-content={!rightSection} class:ad-section-50={rightSection} class:divide={rightSection}>    
    {#if showHeader}
      <div class="ac-header short mirror divide">
        <div class="tool flex-row-center">
          <ActionIcon
            icon={IconClose}
            size={'medium'}
            action={() => {
              dispatch('close')
            }} />
        </div>
        {#if $$slots['navigate-actions']}
          <slot name="navigate-actions" />
        {/if}
        <div class="ac-header__wrap-title flex-grow">
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
          <div class="flex">
            <slot name="commands" />
          </div>
        {/if}
      </div>
    {:else}
      <div class="ac-header short mirror divide">
        <div class="tool flex-row-center">
          <ActionIcon
            icon={IconClose}
            size={'medium'}
            action={() => {
              dispatch('close')
            }} />
        </div>
        {#if $$slots['navigate-actions']}
          <slot name="navigate-actions" />
        {/if}
      </div>
    {/if}
    {#if $$slots.subtitle}
      <div class="ac-subtitle">
        <div class="ac-subtitle-content">
          <slot name="subtitle" />
        </div>
      </div>
    {/if}
    <div class="flex-col flex-grow">
      <slot />
    </div>
  </div>

  {#if rightSection}
    <slot name="rightSection" />
  {/if}

  <div class="ad-tools flex-row-center flex-grow h-4" class:grow-reverse={reverseCommands}>
    {#if !rightSection && $$slots.commands}
      <div class="flex">
        <slot name="commands" />
      </div>
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

</style>
