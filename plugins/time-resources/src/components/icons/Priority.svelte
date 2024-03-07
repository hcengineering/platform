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
  import type { IconSize } from '@hcengineering/ui'
  import { ToDoPriority } from '@hcengineering/time'
  import { todoPriorities } from '../../utils'

  export let size: IconSize = 'small'
  export let fill: string = 'currentColor'

  export let value: ToDoPriority = ToDoPriority.NoPriority
  export let muted: boolean = false

  $: priorityClassName = todoPriorities[value].name
</script>

<svg
  class="svg-{size} priority-icon {priorityClassName}"
  class:muted
  {fill}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 16 16"
>
  {#if value === ToDoPriority.Urgent}
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm7 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-.026-6.475a.5.5 0 0 0-.5-.525h-.948a.5.5 0 0 0-.5.525l.187 3.726a.788.788 0 0 0 1.574 0z"
    />
  {:else}
    <path class="item" d="M3 10.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" />
    <path class="item" d="M7 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" />
    <path class="item" d="M11 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" />
  {/if}
</svg>

<style lang="scss">
  .priority-icon {
    color: var(--icon-disabled-IconColor);

    &.muted {
      &.low {
        .item:nth-child(1) {
          fill: var(--global-disabled-PriorityColor);
        }
      }

      &.medium {
        .item:nth-child(1),
        .item:nth-child(2) {
          fill: var(--global-disabled-PriorityColor);
        }
      }

      &.high {
        .item:nth-child(1),
        .item:nth-child(2),
        .item:nth-child(3) {
          fill: var(--global-disabled-PriorityColor);
        }
      }

      &.urgent {
        fill: var(--global-disabled-PriorityColor);
      }
    }

    &.low {
      .item:nth-child(1) {
        fill: var(--global-low-PriorityColor);
      }
    }

    &.medium {
      .item:nth-child(1),
      .item:nth-child(2) {
        fill: var(--global-medium-PriorityColor);
      }
    }

    &.high {
      .item:nth-child(1),
      .item:nth-child(2),
      .item:nth-child(3) {
        fill: var(--global-high-PriorityColor);
      }
    }

    &.urgent {
      fill: var(--global-urgent-PriorityColor);
    }

    .item {
      fill: currentColor;
    }
  }
</style>
