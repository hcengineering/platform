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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { AnySvelteComponent } from '@hcengineering/ui'
  import { Icon, IconChevronDown, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let node = false
  export let parent = false
  export let collapsed = false
  export let selected = false
  export let level = 0

  $: style = `padding-left: calc(${level} * 1.25rem);`

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="antiNav-element"
  class:selected
  class:parent
  class:collapsed
  class:child={!node}
  {style}
  on:click={() => {
    if (selected) {
      collapsed = !collapsed
    }
    dispatch('click')
  }}
>
  <span class="an-element__label" class:title={node}>
    {#if icon && !parent}
      <div class="an-element__icon">
        <Icon {icon} {iconProps} size={'small'} />
      </div>
    {/if}
    <span class="overflow-label">
      {#if label}<Label {label} />{:else}{title}{/if}
    </span>

    {#if node}
      <div
        class="an-element__icon-arrow"
        class:collapsed
        on:click={(e) => {
          e.stopPropagation()
          e.preventDefault()
          collapsed = !collapsed
        }}
      >
        <IconChevronDown size={'small'} />
      </div>
    {/if}
  </span>
</div>
{#if node && !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}
