<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { PersonAccount } from '@hcengineering/contact'
  import { PersonAccountRefPresenter } from '@hcengineering/contact-resources'
  import { Doc, Ref, TxMixin } from '@hcengineering/core'
  import { Collaborators } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { IconAdd, IconDelete, Label } from '@hcengineering/ui'
  import notification from '../../plugin'

  export let tx: TxMixin<Doc, Collaborators>
  export let value: Collaborators
  export let prevValue: Collaborators | undefined = undefined

  interface Diff {
    added: Ref<PersonAccount>[]
    removed: Ref<PersonAccount>[]
  }
  const client = getClient()
  const hierarchy = client.getHierarchy()

  function buildDiff (value: Collaborators, prev: Collaborators | undefined): Diff | undefined {
    if (prev === undefined) return
    const added: Ref<PersonAccount>[] = []
    const removed: Ref<PersonAccount>[] = []
    const mixin = hierarchy.as(value, notification.mixin.Collaborators)
    const prevMixin = hierarchy.as(prev, notification.mixin.Collaborators)
    const prevSet = new Set(prevMixin?.collaborators ?? [])
    const newSet = new Set(mixin.collaborators)

    for (const newCollab of mixin.collaborators) {
      if (!prevSet.has(newCollab)) added.push(newCollab as Ref<PersonAccount>)
    }

    for (const oldCollab of prevMixin?.collaborators ?? []) {
      if (!newSet.has(oldCollab)) removed.push(oldCollab as Ref<PersonAccount>)
    }

    return {
      added,
      removed
    }
  }

  $: diff = buildDiff(value, prevValue)
</script>

{#if diff}
  <Label label={notification.string.ChangeCollaborators} />
  {#if diff.added.length > 0}
    <div class="antiHSpacer" />
    <IconAdd size={'x-small'} fill={'var(--theme-trans-color)'} />
    {#each diff.added as add}
      <PersonAccountRefPresenter value={add} disabled inline />
      <div class="antiHSpacer" />
    {/each}
  {/if}
  {#if diff.removed.length > 0}
    <div class="antiHSpacer" />
    <IconDelete size={'x-small'} fill={'var(--theme-trans-color)'} />
    {#each diff.removed as removed}
      <PersonAccountRefPresenter value={removed} disabled inline />
      <div class="antiHSpacer" />
    {/each}
  {/if}
{:else}
  <Label label={notification.string.YouAddedCollaborators} />
{/if}
