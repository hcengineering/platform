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
  import type { Ref, Class, Doc } from '@hcengineering/core'
  import type { Asset } from '@hcengineering/platform'
  import { Icon } from '@hcengineering/ui'
  import { FilterButton } from '@hcengineering/view-resources'

  export let icon: Asset | undefined
  export let label: string
  export let description: string | undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
</script>

<div class="ac-header__wrap-description">
  <div class="flex-row-center clear-mins">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="ac-header__wrap-title" on:click>
      {#if icon}<div class="ac-header__icon"><Icon {icon} size={'small'} /></div>{/if}
      <span class="ac-header__title">{label}</span>
    </div>
    {#if _class}<div class="ml-4"><FilterButton {_class} /></div>{/if}
  </div>
  {#if description}
    <span class="ac-header__description">
      {#if description.trim().startsWith('http://') || description.trim().startsWith('https://')}
        <a href={description} class="whitespace-nowrap" target="_blank" rel="noreferrer noopener">
          {description}
        </a>
      {:else}
        {description}
      {/if}
    </span>{/if}
</div>

<style lang="scss">
  .ac-header__wrap-title:hover {
    cursor: pointer;
    span {
      text-decoration: underline;
    }
  }
</style>
