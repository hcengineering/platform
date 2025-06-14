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
  import { getClient } from '@hcengineering/presentation'
  import { Icon, IconDelete, Label, tooltip, IconAdd, Component } from '@hcengineering/ui'
  import { ActivityTagUpdate, Markdown } from '@hcengineering/communication-types'
  import cardPlugin, { Tag } from '@hcengineering/card'

  import communication from '../../../plugin'

  export let update: ActivityTagUpdate
  export let content: Markdown

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: mixin = hierarchy.hasClass(update.tag) ? (hierarchy.getClass(update.tag) as Tag) : undefined
</script>

{#if mixin !== undefined}
  {#if update.action === 'add'}
    <div class="tag overflow-label flex-gap-2">
      <Icon icon={IconAdd} size="small" />
      <Label label={communication.string.Added} />
      <span class="lower"><Label label={cardPlugin.string.Tag} /></span>
      <Component is={cardPlugin.component.CardTagColored} props={{ labelIntl: mixin.label, color: mixin.background }} />
    </div>
  {:else if update.action === 'remove'}
    <div class="tag overflow-label flex-gap-2">
      <Icon icon={IconDelete} size="small" />
      <Label label={communication.string.Removed} />
      <span class="lower"><Label label={cardPlugin.string.Tag} /></span>
      <Component is={cardPlugin.component.CardTagColored} props={{ labelIntl: mixin.label, color: mixin.background }} />
    </div>
  {/if}
{:else}
  <div class="tag overflow-label flex-gap-2">
    {#if update.action === 'add'}
      <Icon icon={IconAdd} size="small" />
    {:else if update.action === 'remove'}
      <Icon icon={IconDelete} size="small" />
    {/if}
    {content}
  </div>
{/if}

<style lang="scss">
  .tag {
    display: flex;
    align-items: center;
  }
</style>
