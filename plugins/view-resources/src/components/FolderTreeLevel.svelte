<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import { Doc, Ref } from '@hcengineering/core'
  import { Action, IconEdit } from '@hcengineering/ui'
  import { getResource } from '@hcengineering/platform'

  import { TreeItem, getActions as getContributedActions } from '../index'

  export let folders: Ref<Doc>[]
  export let folderById: Map<Ref<Doc>, Doc>
  export let descendants: Map<Ref<Doc>, Doc[]>

  export let selected: Ref<Doc> | undefined
  export let level: number = 0
  export let once: boolean = false

  const dispatch = createEventDispatcher()

  const client = getClient()

  function getTitle (doc: Doc): string {
    return (doc as any)?.title || ''
  }

  function getDescendants (obj: Ref<Doc>): Ref<Doc>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => getTitle(a).localeCompare(getTitle(b))).map((p) => p._id)
  }

  function handleSelected (obj: Ref<Doc>): void {
    dispatch('selected', obj)
  }

  async function getActions (obj: Doc): Promise<Action[]> {
    const result: Action[] = []
    const extraActions = await getContributedActions(client, obj)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(act.action)
          await impl(obj, evt, act.actionProps)
        }
      })
    }
    return result
  }

  $: _folders = folders.map((it) => folderById.get(it)).filter((it) => it !== undefined) as Doc[]
  $: _descendants = new Map(_folders.map((it) => [it._id, getDescendants(it._id)]))
</script>

{#each _folders as doc}
  {@const desc = _descendants.get(doc._id) ?? []}

  {#if doc}
    <TreeItem
      _id={doc._id}
      folderIcon
      title={getTitle(doc)}
      selected={selected === doc._id}
      isFold
      empty={desc.length === 0}
      actions={async () => await getActions(doc)}
      {level}
      shouldTooltip
      on:click={() => {
        handleSelected(doc._id)
      }}
    >
      <svelte:fragment slot="dropbox">
        {#if desc.length > 0 && !once}
          <svelte:self folders={desc} {descendants} {folderById} {selected} level={level + 1} on:selected />
        {/if}
      </svelte:fragment>
    </TreeItem>
  {/if}
{/each}
