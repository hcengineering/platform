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
  import { Icon, IconAdd, IconDelete, Label } from '@hcengineering/ui'
  import { personRefByPersonIdStore, PersonRefPresenter } from '@hcengineering/contact-resources'
  import { Person } from '@hcengineering/contact'
  import { type PersonId, type Ref, notEmpty } from '@hcengineering/core'
  import activity, { DocAttributeUpdates } from '@hcengineering/activity'
  import notification from '@hcengineering/notification'

  export let value: DocAttributeUpdates

  $: removed = getPersonRefs(value.removed, $personRefByPersonIdStore)
  $: added = getPersonRefs(value.added.length > 0 ? value.added : value.set, $personRefByPersonIdStore)

  function getPersonRefs (
    values: DocAttributeUpdates['removed' | 'added' | 'set'],
    personRefByPersonId: Map<PersonId, Ref<Person>>
  ): Ref<Person>[] {
    const persons = new Set(
      values
        .map((value) => {
          if (typeof value !== 'string') {
            return undefined
          }

          const person = personRefByPersonId.get(value as PersonId)

          if (person === undefined) {
            return undefined
          }

          return person
        })
        .filter(notEmpty)
    )

    return Array.from(persons)
  }

  $: hasDifferentChanges = added.length > 0 && removed.length > 0
</script>

<span class="root">
  <Icon icon={activity.icon.Activity} size="small" />
  <span class="label">
    {#if hasDifferentChanges}
      <Label label={notification.string.ChangedCollaborators} />:
    {:else if added.length > 0}
      <Label label={notification.string.NewCollaborators} />:
    {:else if removed.length > 0}
      <Label label={notification.string.RemovedCollaborators} />:
    {/if}
  </span>

  {#if added.length > 0}
    <span class="row">
      {#if hasDifferentChanges}
        <IconAdd size={'x-small'} fill={'var(--theme-trans-color)'} />
      {/if}
      {#each added as add}
        <PersonRefPresenter value={add} avatarSize="card" compact />
      {/each}
    </span>
  {/if}
  <span class="antiHSpacer"></span>
  {#if removed.length > 0}
    <span class="row">
      {#if hasDifferentChanges}
        <IconDelete size={'x-small'} fill={'var(--theme-trans-color)'} />
      {/if}
      {#each removed as remove}
        <PersonRefPresenter value={remove} avatarSize="card" compact />
      {/each}
    </span>
  {/if}
</span>

<style lang="scss">
  .root {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .label {
    white-space: nowrap;
  }

  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
</style>
