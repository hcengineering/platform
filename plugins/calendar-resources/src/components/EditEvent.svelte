<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Event } from '@anticrm/calendar'
  import contact from '@anticrm/contact'
  import { getClient,UserBoxList } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Label,StylishEdit } from '@anticrm/ui'
  import { createEventDispatcher,onMount } from 'svelte'
  import calendar from '../plugin'

  export let object: Event

  const dispatch = createEventDispatcher()
  const client = getClient()

  onMount(() => {
    dispatch('open', {
      ignoreKeys: ['comments', 'title', 'description']
    })
  })
</script>

{#if object !== undefined}
  <div class="mb-2">
    <div class="mb-4">
      <StylishEdit
        label={calendar.string.Title}
        bind:value={object.title}
        on:change={() => client.update(object, { title: object.title })}
      />
    </div>
    <div class="mb-2">
      <StyledTextBox
        emphasized
        content={object.description}
        on:value={(evt) => {
          client.update(object, { description: evt.detail })
        }}
        label={calendar.string.Description}
        placeholder={calendar.string.Description}
      />
    </div>
    <div class="flex-row">
      <div class="mt-4 mb-2">
        <Label label={calendar.string.Participants} />
      </div>
      <UserBoxList
        _class={contact.class.Employee}
        items={object.participants}
        title={calendar.string.Participants}
        on:open={(evt) => {
          client.update(object, { $push: { participants: evt.detail._id } })
        }}
        on:delete={(evt) => {
          client.update(object, { $pull: { participants: evt.detail._id } })
        }}
        noItems={calendar.string.NoParticipants}
      />
    </div>
  </div>
{/if}
