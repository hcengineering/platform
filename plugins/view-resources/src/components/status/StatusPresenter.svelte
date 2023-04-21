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
  import { Status, StatusValue, WithLookup } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon } from '@hcengineering/ui'

  export let icon: Asset | AnySvelteComponent | undefined = undefined

  export let value: Status | WithLookup<Status> | StatusValue | undefined
  export let size: 'small' | 'medium' = 'small'
</script>

{#if value}
  <div class="flex-presenter">
    {#if icon && typeof icon === 'string'}
      <Icon {icon} {size} />
    {:else if icon !== undefined && typeof icon !== 'string'}
      <svelte:component this={icon} {value} {size} />
    {/if}
    <span class="overflow-label" class:ml-1-5={icon !== undefined}>
      {value.name}
    </span>
  </div>
{/if}
