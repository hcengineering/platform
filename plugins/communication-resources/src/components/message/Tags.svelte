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
  import { Class, ClassifierKind, Doc, Mixin, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Component, Icon, Label, themeStore, tooltip } from '@hcengineering/ui'
  import cardPlugin, { Card, MasterTag, Tag } from '@hcengineering/card'

  export let value: Card

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let tags: Array<Tag> = []

  $: {
    const parentClass: Ref<Class<Doc>> = hierarchy.getParentClass(value._class)

    tags = hierarchy
      .getDescendants(parentClass)
      .filter((m) => hierarchy.getClass(m).kind === ClassifierKind.MIXIN && hierarchy.hasMixin(value, m))
      .map((m) => hierarchy.getClass(m) as Mixin<Doc>)
  }

  $: type = hierarchy.getClass(value._class) as MasterTag
</script>

<div class="tags-container">
  <Component is={cardPlugin.component.CardTagColored} props={{ labelIntl: type.label, color: type.background }} />
  {#if tags.length > 0}
    <div class="divider" />
    {#each tags as tag}
      <Component is={cardPlugin.component.CardTagColored} props={{ labelIntl: tag.label, color: tag.background }} />
    {/each}
  {/if}
</div>

<style lang="scss">
  .tags-container {
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }
  .divider {
    border: 1px solid var(--theme-content-color);
    width: 1px;
    height: 100%;
    margin: 0 0.125rem;
  }
</style>
