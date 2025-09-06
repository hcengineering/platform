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
  import { ActivityCollaboratorsUpdate } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import contact, { Person } from '@hcengineering/contact'
  import { Icon, Label } from '@hcengineering/ui'

  import communication from '../../../plugin'
  import CollaboratorPresenter from '../../CollaboratorPresenter.svelte'

  export let update: ActivityCollaboratorsUpdate
  export let card: Card
  export let author: Person | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: clazz = hierarchy.getClass(card._class)
  $: isAuthorJoined = author?.personUuid && update.added.length === 1 && update.added.includes(author.personUuid as any)
  $: isAuthorLeft =
    author?.personUuid && update.removed.length === 1 && update.removed.includes(author.personUuid as any)
</script>

{#if isAuthorJoined}
  <div class="flex-presenter overflow-label flex-gap-1 no-pointer">
    <span class="mr-1 icon"><Icon icon={contact.icon.Contacts} size="small" /></span>
    <Label label={communication.string.JoinedThe} />
    <span class="lower"><Label label={clazz.label} /></span>
  </div>
{:else if isAuthorLeft}
  <div class="flex-presenter overflow-label flex-gap-1 no-pointer">
    <span class="mr-1 icon"><Icon icon={contact.icon.Contacts} size="small" /></span>
    <Label label={communication.string.LeftThe} />
    <span class="lower"><Label label={clazz.label} /></span>
  </div>
{:else}
  <span class="flex-presenter flex-gap-2 no-pointer">
    <span class="flex-presenter flex-gap-2 no-pointer">
      <span class="mr-1 icon"><Icon icon={contact.icon.Contacts} size="small" /></span>
      {#if update.added.length > 0}
        <Label label={communication.string.Added} />
      {:else}
        <Label label={communication.string.Removed} />
      {/if}
    </span>

    <span class="collaborators-list flex-gap-1 overflow-label">
      {#each update.added as collaborator}
        <CollaboratorPresenter {collaborator} />
      {/each}
      {#each update.removed as collaborator}
        <CollaboratorPresenter {collaborator} />
      {/each}
    </span>
  </span>
{/if}

<style lang="scss">
  .collaborators-list {
    display: inline-block;
    flex: 1 1 0;
    min-width: 0;
    max-width: 100%;

    :global(a:not(:last-of-type)) {
      :global(.ap-label)::after {
        content: ',';
        margin-right: 0.25rem;
      }
    }
  }

  .icon {
    color: var(--global-secondary-TextColor);
    fill: var(--global-secondary-TextColor);

    &:hover {
      color: var(--global-secondary-TextColor);
      fill: var(--global-secondary-TextColor);
    }
  }
</style>
