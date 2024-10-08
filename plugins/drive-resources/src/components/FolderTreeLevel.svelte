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
  import { Doc, Ref } from '@hcengineering/core'
  import { Folder } from '@hcengineering/drive'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, IconEdit } from '@hcengineering/ui'
  import { getActions as getContributedActions, TreeItem } from '@hcengineering/view-resources'

  export let folders: Ref<Folder>[]
  export let folderById: Map<Ref<Folder>, Folder>
  export let descendants: Map<Ref<Folder>, Folder[]>

  export let selected: Ref<Doc> | undefined
  export let level: number = 0
  export let once: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  function getDescendants (obj: Ref<Folder>): Ref<Folder>[] {
    return (descendants.get(obj) ?? []).sort((a, b) => a.title.localeCompare(b.title)).map((p) => p._id)
  }

  async function getActions (obj: Folder): Promise<Action[]> {
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

  function handleSelected (obj: Ref<Folder>): void {
    dispatch('selected', obj)
  }

  $: _folders = folders.map((it) => folderById.get(it)).filter((it) => it !== undefined) as Folder[]
  $: _descendants = new Map(_folders.map((it) => [it._id, getDescendants(it._id)]))
</script>

{#each _folders as doc}
  {@const desc = _descendants.get(doc._id) ?? []}

  {#if doc}
    <TreeItem
      _id={doc._id}
      folderIcon
      title={doc.title}
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
