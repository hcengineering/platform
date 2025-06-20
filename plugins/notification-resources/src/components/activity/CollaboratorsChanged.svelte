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
  import { employeeRefByAccountUuidStore, PersonRefPresenter } from '@hcengineering/contact-resources'
  import { Person } from '@hcengineering/contact'
  import { type Ref, type AccountUuid, notEmpty, Doc, Collaborator } from '@hcengineering/core'
  import activity, { DisplayDocUpdateMessage, DocAttributeUpdates } from '@hcengineering/activity'
  import notification from '@hcengineering/notification'

  export let message: DisplayDocUpdateMessage
  export let value: Collaborator

  $: person = $employeeRefByAccountUuidStore.get(value.collaborator)
</script>

<span class="root">
  <Icon icon={activity.icon.Activity} size="small" />
  <span class="label">
    {#if message.action === 'create'}
      <Label label={notification.string.NewCollaborators} />:
    {:else}
      <Label label={notification.string.RemovedCollaborators} />:
    {/if}
  </span>

  {#if person !== undefined}
    <span class="row">
      <PersonRefPresenter value={person} avatarSize="card" compact />
    </span>
  {/if}
</span>

<style lang="scss">
  .root {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    color: var(--global-primary-TextColor);
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
