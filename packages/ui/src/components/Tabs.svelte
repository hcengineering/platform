<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { TabModel } from '../types'
  import Component from './Component.svelte'
  import TabsControl from './TabsControl.svelte'

  export let model: TabModel
  export let selected = 0
  export let padding: string | undefined = undefined
  export let noMargin: boolean = false
  export let size: 'small' | 'medium' = 'medium'
</script>

<TabsControl {model} {padding} {noMargin} {size} bind:selected>
  <svelte:fragment slot="rightButtons">
    {#if $$slots.rightButtons}
      <div class="flex">
        <slot name="rightButtons" />
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="content" let:selected>
    {@const tab = model[selected]}
    {#if tab}
      {#if typeof tab.component === 'string'}
        <Component is={tab.component} props={tab.props} on:change on:open />
      {:else}
        <svelte:component this={tab.component} {...tab.props} on:change on:open />
      {/if}
    {/if}
  </svelte:fragment>
</TabsControl>
