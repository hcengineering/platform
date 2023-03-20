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
  import { getClient } from '@hcengineering/presentation'
  import { UserBox } from '@hcengineering/contact-resources'
  import type { Lead } from '@hcengineering/lead'
  import { EditBox, Grid } from '@hcengineering/ui'
  import contact from '@hcengineering/contact'
  import { createEventDispatcher, onMount } from 'svelte'
  import lead from '../plugin'

  export let object: Lead

  const dispatch = createEventDispatcher()
  const client = getClient()

  let oldTitle: string = ''
  let rawTitle: string = ''
  $: if (oldTitle !== object.title) {
    oldTitle = object.title
    rawTitle = object.title
  }

  function change (field: string, value: any) {
    client.updateDoc(object._class, object.space, object._id, { [field]: value })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title', 'customer'] })
  })
</script>

{#if object !== undefined}
  <Grid column={2} rowGap={1}>
    <EditBox
      bind:value={rawTitle}
      placeholder={lead.string.LeadPlaceholder}
      kind={'large-style'}
      focusable
      on:blur={() => {
        if (rawTitle !== object.title) change('title', rawTitle)
      }}
    />
    <UserBox
      _class={contact.class.Contact}
      label={lead.string.Customer}
      placeholder={lead.string.SelectCustomer}
      kind={'link'}
      size={'x-large'}
      justify={'left'}
      width={'100%'}
      bind:value={object.attachedTo}
      on:change={() => {
        change('attachedTo', object.attachedTo)
      }}
    />
  </Grid>
{/if}
