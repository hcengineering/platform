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
  import contact, { Contact } from '@anticrm/contact'
  import core, { Data, Ref, Space } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { Card, getClient, UserBox } from '@anticrm/presentation'
  import type { Lead } from '@anticrm/lead'
  import { EditBox, Grid, Status as StatusControl } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  export let space: Ref<Space>

  let _space = space
  const status: Status = OK

  let customer: Ref<Contact> | null = null

  let title: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const leadId = generateId()

  export function canClose (): boolean {
    return title !== ''
  }

  async function createLead () {
    const state = await client.findOne(core.class.State, { space: _space })
    if (state === undefined) {
      throw new Error('create application: state not found')
    }
    const sequence = await client.findOne(view.class.Sequence, { attachedTo: lead.class.Lead })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.updateDoc(
      view.class.Sequence,
      view.space.Sequence,
      sequence._id,
      {
        $inc: { sequence: 1 }
      },
      true
    )

    const value: Data<Lead> = {
      state: state._id,
      doneState: null,
      number: (incResult as any).object.sequence,
      title: title,
      customer: customer!
    }

    await client.createDoc(lead.class.Lead, _space, value, leadId)
    dispatch('close')
  }
</script>

<Card
  label={lead.string.CreateLead}
  okAction={createLead}
  canSave={title.length > 0 && customer !== null}
  spaceClass={lead.class.Funnel}
  spaceLabel={lead.string.FunnelName}
  spacePlaceholder={lead.string.SelectFunnel}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={lead.string.LeadName}
      bind:value={title}
      icon={lead.icon.Lead}
      placeholder="The simple lead"
      maxWidth="39rem"
      focus
    />
    <UserBox _class={contact.class.Contact} title="Customer" caption="Select customer" bind:value={customer} />
  </Grid>
</Card>
