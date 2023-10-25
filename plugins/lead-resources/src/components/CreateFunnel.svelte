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
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import core, { Account, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Funnel } from '@hcengineering/lead'
  import presentation, { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import task, { ProjectType } from '@hcengineering/task'
  import ui, { Component, EditBox, Grid, IconFolder, Label, ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  export let funnel: Funnel | undefined = undefined
  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: isNew = !funnel

  let name: string = funnel?.name ?? ''
  const description: string = funnel?.description ?? ''
  let type: Ref<ProjectType> | undefined
  let isPrivate: boolean = funnel?.private ?? false

  let members: Ref<Account>[] =
    funnel?.members !== undefined ? hierarchy.clone(funnel.members) : [getCurrentAccount()._id]

  export function canClose (): boolean {
    return name === '' && type !== undefined
  }

  async function createFunnel (): Promise<void> {
    if (type === undefined) return
    await client.createDoc(lead.class.Funnel, core.space.Space, {
      name,
      description,
      private: isPrivate,
      archived: false,
      members,
      type
    })
  }
  async function save (): Promise<void> {
    if (isNew) {
      await createFunnel()
    } else if (funnel !== undefined) {
      await client.diffUpdate<Funnel>(funnel, { name, description, members, private: isPrivate }, Date.now())
    }
  }
</script>

<SpaceCreateCard
  label={lead.string.CreateFunnel}
  okAction={save}
  okLabel={!isNew ? ui.string.Save : undefined}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={lead.string.FunnelName}
      icon={IconFolder}
      bind:value={name}
      placeholder={lead.string.FunnelName}
      autoFocus
    />
    <ToggleWithLabel
      label={presentation.string.MakePrivate}
      description={presentation.string.MakePrivateDescription}
      bind:on={isPrivate}
    />

    <Component
      is={task.component.ProjectTypeSelector}
      props={{
        categories: [lead.category.FunnelTypeCategory],
        type,
        disabled: funnel !== undefined
      }}
      on:change={(evt) => {
        type = evt.detail
      }}
    />
    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={lead.string.Members} />
      </div>
      <AccountArrayEditor
        value={members}
        label={lead.string.Members}
        onChange={(refs) => (members = refs)}
        kind={'regular'}
        size={'large'}
      />
    </div>
  </Grid>
</SpaceCreateCard>
