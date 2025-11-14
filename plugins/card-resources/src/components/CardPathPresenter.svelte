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
  import cardPlugin, { Card } from '@hcengineering/card'
  import { WithLookup } from '@hcengineering/core'
  import { Icon, tooltip } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import TagDivider from './TagDivider.svelte'

  import { openCardInSidebar } from '../utils'
  import CardIcon from './CardIcon.svelte'

  export let card: WithLookup<Card>
  export let displaySpace: boolean = true
</script>

<div class="flex-presenter flex-gap-0-5">
  {#if displaySpace && card.$lookup?.space !== undefined}
    <div class="card-presenter">
      <Icon icon={cardPlugin.icon.Space} size="small" />
      <span class="overflow-label max-w-40">
        {card.$lookup?.space.name}
      </span>
    </div>
  {/if}
  {#if card.parentInfo?.length > 0}
    {#if displaySpace && card.$lookup?.space !== undefined}
      <TagDivider />
    {/if}
    {@const info = card.parent != null ? card.parentInfo?.find((it) => it._id === card.parent) : card.parentInfo?.[0]}
    {#if info}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="card-presenter clickable"
        use:tooltip={{ label: getEmbeddedLabel(info.title), textAlign: 'left' }}
        on:click|stopPropagation|preventDefault={() => openCardInSidebar(info._id)}
      >
        <CardIcon size="x-small" _id={info._id} editable={false} />
        <span class="overflow-label max-w-40">
          {info.title}
        </span>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .card-presenter {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 2rem;
    max-width: 25rem;
    min-height: 1.5rem;
    max-height: 1.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    gap: 0.25rem;
    color: var(--global-secondary-TextColor);

    &.clickable {
      cursor: pointer;
    }
  }
</style>
