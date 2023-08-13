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
  import { Person } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { Button, Icon, IconClose } from '@hcengineering/ui'
  import calendar from '../plugin'
  import AddParticipant from './AddParticipant.svelte'
  import { ContactRefPresenter } from '@hcengineering/contact-resources'

  export let participants: Ref<Person>[]
  export let externalParticipants: string[]

  $: placeholder =
    participants.length > 0 || externalParticipants.length > 0
      ? calendar.string.AddParticipants
      : calendar.string.Participants

  function removeParticipant (_id: Ref<Person>): void {
    const index = participants.findIndex((p) => p === _id)
    if (index !== -1) {
      participants.splice(index, 1)
      participants = participants
    }
  }

  function removeExtParticipant (val: string): void {
    const index = externalParticipants.findIndex((p) => p === val)
    if (index !== -1) {
      externalParticipants.splice(index, 1)
      externalParticipants = externalParticipants
    }
  }
</script>

<div class="container flex-col">
  <div class="header flex-row-center flex-gap-3">
    <Icon icon={calendar.icon.Participants} size="small" />
    <AddParticipant {placeholder} />
  </div>
  <div class="content">
    {#each participants as participant}
      <div class="flex-between item">
        <ContactRefPresenter disabled value={participant} />
        <div class="tool">
          <Button
            icon={IconClose}
            iconProps={{ size: 'medium', fill: 'var(--theme-dark-color)' }}
            kind={'ghost'}
            size={'small'}
            on:click={() => {
              removeParticipant(participant)
            }}
          />
        </div>
      </div>
    {/each}
    {#each externalParticipants as participant}
      <div class="flex-between item">
        {participant}
        <div class="tool">
          <Button
            icon={IconClose}
            iconProps={{ size: 'medium', fill: 'var(--theme-dark-color)' }}
            kind={'ghost'}
            size={'small'}
            on:click={() => {
              removeExtParticipant(participant)
            }}
          />
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .container {
    margin: 0 1.25rem;

    .content {
      margin-top: 0.25rem;
      margin-left: 1.75rem;
    }

    .item {
      .tool {
        opacity: 0;
      }

      &:hover {
        .tool {
          opacity: 1;
        }
      }
    }
  }
</style>
