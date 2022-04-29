<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import calendar from '@anticrm/calendar'
  import contact, { Contact } from '@anticrm/contact'
  import { getClient, UserBox, UserBoxList } from '@anticrm/presentation'
  import type { Review } from '@anticrm/recruit'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Grid, Label, showPanel, StylishEdit, EditBox } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import recruit from '../../plugin'

  export let object: Review

  const dispatch = createEventDispatcher()
  const client = getClient()

  onMount(() => {
    dispatch('open', {
      ignoreKeys: ['number', 'comments', 'title', 'description', 'verdict'],
      ignoreMixins: [calendar.mixin.Reminder]
    })
  })

  let candidate: Contact | undefined = undefined

  async function updateSelected (object: Review) {
    candidate = await client.findOne<Contact>(object.attachedToClass, { _id: object.attachedTo })
  }

  $: updateSelected(object)
</script>

{#if object !== undefined}
  <Grid column={2}>
    <EditBox
      icon={recruit.icon.Review}
      label={calendar.string.Title}
      maxWidth={'20rem'}
      bind:value={object.title}
      on:change={() => client.update(object, { title: object.title })}
    />
    <div
      class="clear-mins"
      on:click={() => {
        if (candidate !== undefined) {
          showPanel(view.component.EditDoc, candidate._id, candidate._class, 'content')
        }
      }}
    >
      <UserBox
        readonly
        _class={contact.class.Person}
        label={recruit.string.Candidate}
        placeholder={recruit.string.Candidates}
        value={object.attachedTo}
        kind={'link'}
        size={'x-large'}
        justify={'left'}
        width={'100%'}
      />
    </div>
  </Grid>
  <div class="mt-4 mb-4">
    <StyledTextBox
      label={recruit.string.Description}
      emphasized
      content={object.description}
      on:value={(evt) => {
        client.update(object, { description: evt.detail })
      }}
    />
  </div>
  <div class="flex-row mb-2">
    <Label label={calendar.string.Participants} />
  </div>
  <div class="mb-4">
    <UserBoxList
      _class={contact.class.Employee}
      items={object.participants}
      label={calendar.string.Participants}
      on:open={(evt) => {
        client.update(object, { $push: { participants: evt.detail._id } })
      }}
      on:delete={(evt) => {
        client.update(object, { $pull: { participants: evt.detail._id } })
      }}
    />
  </div>
  <StylishEdit
    label={recruit.string.Verdict}
    bind:value={object.verdict}
    on:change={() => client.update(object, { verdict: object.verdict })}
  />
{/if}
