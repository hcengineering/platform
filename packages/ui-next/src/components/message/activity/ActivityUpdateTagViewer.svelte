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
  import { IconDelete } from '@hcengineering/ui'
  import { ActivityTagUpdate, RichText } from '@hcengineering/communication-types'
  import cardPlugin from '@hcengineering/card'

  import Icon from '../../Icon.svelte'
  import Label from '../../Label.svelte'
  import IconPlus from '../../icons/IconPlus.svelte'
  import uiNext from '../../../plugin'

  export let update: ActivityTagUpdate
  export let content: RichText

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: mixin = hierarchy.hasClass(update.tag) ? hierarchy.getClass(update.tag) : undefined
</script>

{#if mixin !== undefined}
  {#if update.action === 'add'}
    <div class="flex-presenter overflow-label flex-gap-2">
      <Icon icon={IconPlus} size="small" />
      <Label label={uiNext.string.Added} />
      <span class="lower"><Label label={cardPlugin.string.Tag} /></span>
      <div class="tag no-word-wrap">
        <Label label={mixin.label} />
      </div>
    </div>
  {:else if update.action === 'remove'}
    <div class="flex-presenter overflow-label flex-gap-2">
      <Icon icon={IconDelete} size="small" />
      <Label label={uiNext.string.Removed} />
      <span class="lower"><Label label={cardPlugin.string.Tag} /></span>
      <div class="tag no-word-wrap">
        <Label label={mixin.label} />
      </div>
    </div>
  {/if}
{:else}
  <div class="flex-presenter overflow-label flex-gap-2">
    {#if update.action === 'add'}
      <Icon icon={IconPlus} size="small" />
    {:else if update.action === 'remove'}
      <Icon icon={IconDelete} size="small" />
    {/if}
    {content}
  </div>
{/if}

<style lang="scss">
  .tag {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--theme-content-color);

    border-radius: 6rem;

    color: var(--theme-caption-color);

    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
