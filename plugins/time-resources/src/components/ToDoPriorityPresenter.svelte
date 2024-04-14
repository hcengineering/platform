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
  import { ToDoPriority } from '@hcengineering/time'
  import { Label } from '@hcengineering/ui'
  import { getToDoPriorityColor, todoPriorities } from '../utils'
  import Priority from './icons/Priority.svelte'

  export let value: ToDoPriority
  export let muted: boolean = false
  export let showLabel: boolean = false

  $: color = muted ? undefined : getToDoPriorityColor(value)
</script>

{#if value !== ToDoPriority.NoPriority}
  <div class="priority-container flex-center flex-gap-1-5">
    <Priority {value} {muted} />
    {#if showLabel}
      <span class="priority-label font-medium-12" style:color>
        <Label label={todoPriorities[value].shortLabel} />
      </span>
    {/if}
  </div>
{/if}

<style lang="scss">
  .priority-label {
    color: var(--global-disabled-PriorityColor);
  }
</style>
