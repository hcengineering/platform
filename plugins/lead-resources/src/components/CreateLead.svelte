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
  import { AttachedData, generateId, Ref, SortingOrder, Space } from '@hcengineering/core'
  import type { Customer, Funnel, Lead } from '@hcengineering/lead'
  import { OK, Status } from '@hcengineering/platform'
  import { Card, createQuery, getClient, InlineAttributeBar, SpaceSelector } from '@hcengineering/presentation'
  import { UserBox } from '@hcengineering/contact-resources'
  import task, { calcRank } from '@hcengineering/task'
  import { Button, createFocusManager, EditBox, FocusHandler, Label, Status as StatusControl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  export let space: Ref<Space>
  export let customer: Ref<Contact> | null = null
  export let preserveCustomer = false

  let _space = space
  const status: Status = OK

  let title: string = ''
  const object: Partial<Lead> = {}

  const dispatch = createEventDispatcher()
  const client = getClient()
  const leadId = generateId() as Ref<Lead>

  export function canClose (): boolean {
    return (preserveCustomer || customer === undefined) && title === ''
  }

  let funnels: Funnel[] = []
  const funnelQuery = createQuery()
  funnelQuery.query(lead.class.Funnel, {}, (res) => (funnels = res))

  $: {
    if (funnels.find((it) => it._id === _space) === undefined) {
      _space = funnels[0]?._id
    }
  }

  async function createLead () {
    const state = await client.findOne(task.class.State, { space: _space }, { sort: { rank: SortingOrder.Ascending } })
    if (state === undefined) {
      throw new Error('create application: state not found')
    }
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: lead.class.Lead })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const lastOne = await client.findOne(lead.class.Lead, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const value: AttachedData<Lead> = {
      status: state._id,
      doneState: null,
      number: (incResult as any).object.sequence,
      title,
      rank: calcRank(lastOne, undefined),
      assignee: null,
      startDate: null,
      dueDate: null,
      ...object
    }

    const customerInstance = await client.findOne(contact.class.Contact, { _id: customer! })
    if (customerInstance === undefined) {
      throw new Error('contact not found')
    }
    if (!client.getHierarchy().hasMixin(customerInstance, lead.mixin.Customer)) {
      await client.createMixin<Contact, Customer>(
        customerInstance._id,
        customerInstance._class,
        customerInstance.space,
        lead.mixin.Customer,
        { description: '' }
      )
    }

    await client.addCollection(lead.class.Lead, _space, customer!, lead.mixin.Customer, 'leads', value, leadId)
    dispatch('close')
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<Card
  label={lead.string.CreateLead}
  okAction={createLead}
  canSave={title.length > 0 && customer !== null}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={lead.class.Funnel}
      label={lead.string.FunnelName}
      kind={'regular'}
      size={'large'}
      bind:space={_space}
      create={{
        component: lead.component.CreateFunnel,
        label: lead.string.CreateFunnel
      }}
    />
  </svelte:fragment>
  <svelte:fragment slot="title">
    <div class="flex-row-center gap-2">
      {#if preserveCustomer}
        <UserBox
          readonly
          _class={contact.class.Contact}
          options={{ sort: { modifiedOn: -1 } }}
          excluded={[]}
          label={lead.string.Leads}
          placeholder={lead.string.Leads}
          bind:value={customer}
          kind={'regular'}
          size={'large'}
        />
      {/if}
      <Label label={lead.string.CreateLead} />
    </div>
  </svelte:fragment>

  <StatusControl slot="error" {status} />
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={lead.icon.Lead} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <EditBox
      focusIndex={1}
      bind:value={title}
      placeholder={lead.string.LeadPlaceholder}
      kind={'large-style'}
      autoFocus
    />
  </div>

  <svelte:fragment slot="pool">
    {#if !preserveCustomer}
      <UserBox
        focusIndex={2}
        _class={contact.class.Contact}
        label={lead.string.Customer}
        placeholder={lead.string.SelectCustomer}
        bind:value={customer}
        kind={'regular'}
        size={'large'}
        create={{ component: lead.component.CreateCustomer, label: lead.string.CreateCustomer }}
      />
    {/if}
    <InlineAttributeBar
      _class={lead.class.Lead}
      {object}
      toClass={task.class.Task}
      on:update
      extraProps={{ showNavigate: false }}
    />
  </svelte:fragment>
</Card>
