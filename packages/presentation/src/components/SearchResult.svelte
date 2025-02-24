<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { SearchResultDoc } from '@hcengineering/core'
  import { getResourceC } from '@hcengineering/platform'
  import { Icon, type AnySvelteComponent } from '@hcengineering/ui'

  export let value: SearchResultDoc

  $: icon = value.icon

  let iconComponent: AnySvelteComponent | undefined
  let shortTitleComponent: AnySvelteComponent | undefined
  let titleComponent: AnySvelteComponent | undefined

  $: getResourceC(value.iconComponent?.component, (r) => {
    iconComponent = r
  })

  $: getResourceC(value.shortTitleComponent?.component, (r) => {
    shortTitleComponent = r
  })

  $: getResourceC(value.titleComponent?.component, (r) => {
    titleComponent = r
  })
</script>

<div class="flex-row-center">
  <div class="flex-center p-1 content-dark-color flex-no-shrink">
    {#if iconComponent}
      <div class="icon-place">
        <svelte:component this={iconComponent} size={'smaller'} {...value.iconComponent?.props} />
      </div>
    {:else if icon !== undefined}
      <Icon {icon} size={'small'} />
    {/if}
  </div>
  <span class="ml-1 max-w-120 overflow-label searchResult flex-row-center">
    {#if shortTitleComponent}
      <svelte:component this={shortTitleComponent} {...value.shortTitleComponent?.props} />
    {:else if value.shortTitle !== undefined}
      <span class="shortTitle">{value.shortTitle}</span>
    {/if}
    {#if titleComponent}
      <svelte:component this={titleComponent} {...value.titleComponent?.props} />
    {:else}
      <span class="name">{value.title}</span>
    {/if}
  </span>
</div>

<style lang="scss">
  .icon-place {
    width: 1.75rem;
  }
  .searchResult {
    display: flex;
    flex-direction: row;

    .shortTitle {
      display: flex;
      padding-right: 0.5rem;
      color: var(--theme-darker-color);
    }
    .name {
      display: flex;
      flex: 1;
    }
  }
</style>
