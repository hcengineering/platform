<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Icon } from '@hcengineering/ui'

  import { DisplayInlineCommand } from '../types'

  export let value: DisplayInlineCommand

  $: twoLines = value.description !== undefined
</script>

<div class="container" class:oneLine={!twoLines} data-id={value.command}>
  <div class:mt-1={twoLines}>
    <Icon icon={value.icon} size="small" />
  </div>
  <div class="flex-col flex-gap-1">
    <div class="flex-presenter fs-bold">
      {#if value.type === 'command'}
        {#if value.commandTemplate}
          {value.commandTemplate}
        {:else}
          /{value.command}
        {/if}
      {:else}
        {value.title}
      {/if}
    </div>
    {#if twoLines}
      <div class="flex-presenter description">
        {#if value.description}
          {value.description}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    gap: 0.5rem;

    &.oneLine {
      align-items: center;
    }
  }

  .description {
    color: var(--global-secondary-TextColor);
  }
</style>
