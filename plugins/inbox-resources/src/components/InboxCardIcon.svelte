<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->

<script lang="ts">
  import cardPlugin, { Card } from '@hcengineering/card'
  import { Component } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import communication from '@hcengineering/communication'

  import NotifyMarker from './NotifyMarker.svelte'

  export let card: Card
  export let count: number = 0

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: size = hierarchy.isDerived(card._class, communication.type.Direct) ? 'large' : 'medium'
</script>

<div class="card-icon">
  <Component is={cardPlugin.component.CardIcon} props={{ value: card, size }} />

  {#if count > 0}
    <div class="card-icon__marker">
      <NotifyMarker {count} size="small" />
    </div>
  {/if}
</div>

<style lang="scss">
  .card-icon {
    display: inline-flex;
    position: relative;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    min-width: 2.5rem;
    min-height: 2.5rem;
    color: var(--global-secondary-TextColor);
    background-color: var(--global-ui-BackgroundColor);
    border: 1px solid var(--global-subtle-ui-BorderColor);
    border-radius: var(--medium-BorderRadius);
    fill: var(--global-secondary-TextColor);

    &__marker {
      position: absolute;
      top: -0.375rem;
      right: 0;
      transform: translateX(calc(100% - 0.875rem));
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
