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
  import { getResource } from '@hcengineering/platform'
  import { AnyComponent, Icon } from '@hcengineering/ui'

  export let value: SearchResultDoc

  $: iconComponent = value.iconComponent ? (value.iconComponent as AnyComponent) : undefined
  $: icon = value.icon !== undefined ? value.icon : undefined
</script>

<div class="flex-row-center">
  <div class="flex-center p-1 content-dark-color flex-no-shrink">
    {#if icon !== undefined}
      <Icon {icon} size={'medium'} />
    {/if}
    {#if iconComponent}
      {#await getResource(iconComponent) then component}
        <svelte:component this={component} size={'smaller'} {...value.iconProps} />
      {/await}
    {/if}
  </div>
  <span class="ml-2 max-w-120 overflow-label searchResult">
    {#if value.shortTitle !== undefined}
      <span class="shortTitle">{value.shortTitle}</span>
    {/if}
    <span class="name">{value.title}</span>
  </span>
</div>

<style lang="scss">
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
