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
  import contact, { Contact } from '@hcengineering/contact'
  import { UserBox } from '@hcengineering/contact-resources'
  import { getClient } from '@hcengineering/presentation'
  import type { Review } from '@hcengineering/recruit'
  import { FullDescriptionBox } from '@hcengineering/text-editor'
  import { EditBox, Grid } from '@hcengineering/ui'
  import { ObjectPresenter, openDoc } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import recruit from '../../plugin'

  export let object: Review

  const dispatch = createEventDispatcher()
  const client = getClient()

  let oldTitle: string = ''
  let rawTitle: string = ''
  $: if (oldTitle !== object.title) {
    oldTitle = object.title
    rawTitle = object.title
  }

  onMount(() => {
    dispatch('open', {
      ignoreKeys: ['number', 'comments', 'title', 'description', 'verdict']
    })
  })

  let candidate: Contact | undefined = undefined

  async function updateSelected (object: Review) {
    candidate =
      object?.attachedTo !== undefined
        ? await client.findOne<Contact>(object.attachedToClass, { _id: object.attachedTo })
        : undefined
  }

  $: updateSelected(object)
</script>

{#if object !== undefined}
  <Grid column={1} rowGap={1.5}>
    <Grid column={2} columnGap={1}>
      <EditBox
        bind:value={rawTitle}
        kind={'large-style'}
        focusable
        on:blur={() => {
          if (rawTitle !== object.title) client.update(object, { title: rawTitle })
        }}
      />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="clear-mins flex-row-center"
        on:click={() => {
          if (candidate !== undefined) {
            openDoc(client.getHierarchy(), candidate)
          }
        }}
      >
        <ObjectPresenter _class={recruit.class.Applicant} bind:objectId={object.application} />
        <UserBox
          readonly
          _class={contact.class.Person}
          label={recruit.string.Talent}
          placeholder={recruit.string.Talents}
          value={object.attachedTo}
          kind={'link'}
          size={'x-large'}
          justify={'left'}
          width={'100%'}
          showNavigate={false}
        />
      </div>
    </Grid>
    <FullDescriptionBox
      label={recruit.string.Description}
      content={object.description}
      on:save={(res) => {
        client.update(object, { description: res.detail })
      }}
    />
    <EditBox
      bind:value={object.verdict}
      placeholder={recruit.string.Verdict}
      kind={'large-style'}
      focusable
      on:change={() => client.update(object, { verdict: object.verdict })}
    />
  </Grid>
{/if}
