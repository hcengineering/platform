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
  import { getClient, UserBox } from '@anticrm/presentation'
  import type { Lead } from '@anticrm/lead'
  import { EditBox, Grid } from '@anticrm/ui'
  import contact from '@anticrm/contact'
  import { createEventDispatcher, onMount } from 'svelte'
  import lead from '../plugin'

  export let object: Lead

  const dispatch = createEventDispatcher()
  const client = getClient()

  function change (field: string, value: any) {
    client.updateDoc(object._class, object.space, object._id, { [field]: value })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title', 'customer'] })
  })
</script>

{#if object !== undefined}
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={lead.string.LeadName}
      bind:value={object.title}
      icon={lead.icon.Lead}
      placeholder="The simple lead"
      maxWidth="39rem"
      focus
      on:change={(evt) => change('title', object.title)}
    />
    <UserBox
      _class={contact.class.Contact}
      title={lead.string.Customer}
      caption={lead.string.SelectCustomer}
      bind:value={object.customer}
      on:change={() => {
        change('customer', object.customer)
      }}
    />
  </Grid>
{/if}
