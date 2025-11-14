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
  import { getClient } from '@hcengineering/presentation'
  import { Component, Label, tooltip } from '@hcengineering/ui'
  import notification from '@hcengineering/notification'
  import { getDocIdentifier, getDocTitle } from '@hcengineering/view-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Doc } from '@hcengineering/core'

  import { NavigationItem } from '../type'
  import cardPlugin, { Card } from '@hcengineering/card'

  export let doc: Doc | undefined
  export let navItem: NavigationItem

  const client = getClient()

  $: presenterMixin = client
    .getHierarchy()
    .classHierarchyMixin(navItem._class, notification.mixin.NotificationContextPresenter)

  let idTitle: string | undefined
  let title: string | undefined

  $: navItem.type === 'legacy' &&
    doc &&
    getDocIdentifier(client, doc._id, doc._class, doc).then((res) => {
      idTitle = res
    })

  $: navItem.type === 'legacy' &&
    doc &&
    getDocTitle(client, doc._id, doc._class, doc).then((res) => {
      title = res
    })

  function asCard (doc: Doc): Card {
    return doc as Card
  }
</script>

<div class="labels">
  {#if client.getHierarchy().isDerived(navItem._class, cardPlugin.class.Card)}
    {@const label = client.getHierarchy().getClass(doc?._class ?? navItem._class).label}
    <span class="title--bold overflow-label clear-mins">
      <Label {label} />
    </span>
    {#if doc}
      <span class="title overflow-label clear-mins" use:tooltip={{ label: getEmbeddedLabel(asCard(doc).title) }}>
        {asCard(doc).title}
      </span>
    {/if}
  {:else}
    {#if presenterMixin?.labelPresenter && navItem.type === 'legacy'}
      {#if doc}
        <Component
          is={presenterMixin.labelPresenter}
          props={{ context: navItem.context, object: doc }}
          showLoading={false}
        />
      {/if}
    {:else if idTitle}
      <span class="title--bold overflow-label clear-mins" use:tooltip={{ label: getEmbeddedLabel(idTitle) }}>
        {idTitle}
      </span>
    {:else}
      {@const label = client.getHierarchy().getClass(navItem._class).label}
      <span class="title--bold overflow-label clear-mins" use:tooltip={{ label }}>
        <Label {label} />
      </span>
    {/if}
    {@const label = title != null ? getEmbeddedLabel(title) : client.getHierarchy().getClass(navItem._class).label}
    <span class="title overflow-label clear-mins" use:tooltip={{ label }}>
      <Label {label} />
    </span>
  {/if}
</div>

<style lang="scss">
  .labels {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    min-width: 0;
    color: var(--global-primary-TextColor);
    font-size: 0.875rem;
    overflow: hidden;
    height: 2.5rem;
    min-height: 2.5rem;
    max-height: 2.5rem;
  }

  .title {
    font-weight: 400;
    color: var(--global-primary-TextColor);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title--bold {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--global-primary-TextColor);
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
