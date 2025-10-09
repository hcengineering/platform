<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import cardPlugin from '@hcengineering/card'
  import { Component, IconSize, Icon } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import communication from '@hcengineering/communication'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { ObjectIcon } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'

  import NotifyMarker from './NotifyMarker.svelte'

  export let doc: Doc | undefined
  export let count: number = 0

  const client = getClient()
  const hierarchy = client.getHierarchy()
</script>

<div class="card-icon">
  {#if doc}
    {@const size = hierarchy.isDerived(doc._class, communication.type.Direct) ? 'large' : 'medium'}
    {#if hierarchy.isDerived(doc._class, cardPlugin.class.Card)}
      <Component is={cardPlugin.component.CardIcon} props={{ value: doc, size }} />
    {:else}
      <ObjectIcon value={doc} {size} showLoading={false} />
    {/if}
  {/if}

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
