<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License")
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
  import { getClient, createQuery } from '@hcengineering/presentation'
  import { UserBox } from '@hcengineering/contact-resources'
  import type { Lead } from '@hcengineering/lead'
  import { TabList, TabItem, EditBox, Grid } from '@hcengineering/ui'
  import { Channel } from '@hcengineering/contact'
  import contact from '@hcengineering/contact'
  import { getResource } from '@hcengineering/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import lead from '../plugin'

  export let object: Lead

  const dispatch = createEventDispatcher()

  const client = getClient()
  const channelQuery = createQuery()

  let oldTitle: string = ''
  let rawTitle: string = ''

  $: if (oldTitle !== object.title) {
    oldTitle = object.title
    rawTitle = object.title
  }
  type NavEditLeadKey = 'mail' | 'messages' | 'notes' | 'activity'

  function change (field: string, value: any) {
    client.updateDoc(object._class, object.space, object._id, { [field]: value })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title', 'customer'] })
  })

  export let mode: string = 'mail'

  let channel: Partial<Channel> = {}

  const handleViewModeChanged = (newMode: string) => {
    mode = newMode
  }

  $: if (object.attachedTo) {
    channelQuery.query(contact.class.Channel, { attachedTo: object.attachedTo }, ([c]: Channel[]) => {
      if (c) channel = c
    })
  }

  let tabSource: { [index: string]: any } = {
    mail: { labelIntl: lead.string.Mail, presenter: 'gmail:component:Main' },
    messages: { labelIntl: lead.string.Messages, presenter: 'chunter:component:ChannelView' },
    activity: { labelIntl: lead.string.Activity, presenter: 'activity:component:Activity' }
  }

  $: tabSource = {
    ...tabSource,
    mail: { ...tabSource.mail, props: { channel } },
    messages: { ...tabSource.messages, props: { space: object } },
    activity: { ...tabSource.activity, props: { object } }
  }

  const modes: TabItem[] = Object.keys(tabSource).map((id: string) => ({ id, labelIntl: tabSource[id].labelIntl }))

  const resources: any = Object.keys(tabSource).reduce((a, c) => Object.assign(a, { [c as NavEditLeadKey]: null }), {})

  function fetchResources () {
    Object.keys(resources).forEach((key: string) =>
      Object.assign(resources, { [key]: getResource(tabSource[key].presenter) })
    )
  }

  $: fetchResources()

  let props: unknown

  $: if (tabSource[mode].props !== undefined) {
    props = tabSource[mode].props
  }
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
  <div class="tablist container">
    <TabList selected={mode} items={modes} on:select={({ detail }) => handleViewModeChanged(detail.id)} />
    <!-- render tab content in this conditon -->
    <div class="tablist content">
      {#if props !== undefined}
        {#await resources[mode]}
          ...
        {:then instance}
          <svelte:component this={instance} {...props} />
        {/await}
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .tablist.container {
    margin-top: 1.25rem;
    display: flex;
    flex-direction: column;
  }
</style>
