<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import core, { type AccessGroup, type Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../../plugin'

  // Groups already granted on the issue — excluded from the picker.
  export let skip: Array<Ref<AccessGroup>> = []

  const dispatch = createEventDispatcher()

  let groups: AccessGroup[] = []
  const query = createQuery()
  $: query.query(core.class.AccessGroup, {}, (res) => {
    const skipSet = new Set(skip)
    groups = res.filter((g) => !skipSet.has(g._id))
  })

  function select (group: AccessGroup): void {
    dispatch('close', group)
  }
</script>

<div class="antiPopup select-group">
  <div class="header">
    <Label label={tracker.string.SelectAccessGroup} />
  </div>
  <div class="scroll">
    {#if groups.length === 0}
      <div class="empty"><Label label={tracker.string.NoAccessGroups} /></div>
    {/if}
    {#each groups as group (group._id)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="row" on:click={() => { select(group) }}>
        <span class="overflow-label name">{group.name}</span>
        <span class="count">
          <Label label={tracker.string.GroupMembersCount} params={{ count: group.members?.length ?? 0 }} />
        </span>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .select-group {
    display: flex;
    flex-direction: column;
    min-width: 18rem;
    max-height: 24rem;
    padding: 0.5rem;
  }
  .header {
    font-weight: 500;
    color: var(--theme-caption-color);
    padding: 0.25rem 0.5rem 0.5rem;
  }
  .scroll {
    overflow-y: auto;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;

    &:hover {
      background-color: var(--theme-button-hovered);
    }
    .count {
      font-size: 0.75rem;
      color: var(--theme-dark-color);
    }
  }
  .empty {
    padding: 0.5rem;
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
  }
</style>
