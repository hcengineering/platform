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
  import { ButtonIcon, Action } from '@hcengineering/ui'

  export let actions: Action[]
</script>

<div class="message-actions-panel">
  {#each actions as action}
    {#if action.icon}
      <ButtonIcon
        icon={action.icon}
        iconSize="small"
        size="small"
        kind="tertiary"
        tooltip={{ label: action.label, direction: 'bottom' }}
        on:click={(ev) => action.action({}, ev)}
      />
    {/if}
  {/each}
</div>

<style lang="scss">
  .message-actions-panel {
    display: flex;
    background: var(--global-surface-01-BackgroundColor);
    border: 1px solid var(--global-subtle-ui-BorderColor);
    padding: 0.125rem;
    border-radius: 0.5rem;
    gap: 0.25rem;
    box-shadow: 0.5rem 0.75rem 1rem 0.25rem var(--global-popover-ShadowColor);
  }
</style>
