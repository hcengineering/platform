<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import Icon from './Icon.svelte'
  import { IconSize, IconComponent } from '../types'

  export let icon: IconComponent | undefined = undefined
  export let iconSize: IconSize | undefined = undefined
  export let emoji: string = ''
  export let count: number | undefined = undefined
  export let selected: boolean = false
  export let active: boolean = false
</script>

<!--TODO: add users tooltip-->

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="reaction" class:selected class:active on:click>
  <div class="reaction__emoji" class:foreground={icon != null}>
    {#if icon}
      <Icon {icon} size={iconSize} />
    {:else}
      {emoji}
    {/if}
  </div>
  {#if count !== undefined}
    <div class="reaction__count">{count}</div>
  {/if}
</div>

<style lang="scss">
  .reaction {
    display: flex;
    height: 1.75rem;
    padding: 0.375rem;
    align-items: center;
    gap: 0.25rem;
    border-radius: 0.5rem;
    background: var(--next-reaction-counter-rest-color-background);
    cursor: pointer;

    &:hover,
    &.active {
      background: var(--next-reaction-counter-hover-color-background);
    }

    &.selected {
      background: var(--next-reaction-counter-selected-color-background);
    }
  }

  .reaction__emoji {
    color: var(--next-text-color-primary);
    font-size: 1rem;
    font-weight: 400;
    line-height: 1rem;
    &.foreground {
      color: var(--next-reaction-counter-rest-color-foreground);
    }
  }

  .reaction__count {
    color: var(--next-reaction-counter-rest-color-label);
    font-size: 0.75rem;
    font-weight: 500;
  }
</style>
