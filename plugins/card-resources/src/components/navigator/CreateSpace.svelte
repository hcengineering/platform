<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import core, { AccountUuid, Data, Ref, getCurrentAccount } from '@hcengineering/core'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { CardSpace, MasterTag } from '@hcengineering/card'
  import card from '../../plugin'
  import TypesSelector from './TypesSelector.svelte'

  export let space: CardSpace | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let name: string = space?.name ?? ''
  const topLevelTypes = client.getModel().findAllSync(card.class.MasterTag, {
    extends: card.class.Card
  })
  let types: Ref<MasterTag>[] =
    space?.types !== undefined ? hierarchy.clone(space.types) : topLevelTypes.map((it) => it._id)
  let isPrivate: boolean = space?.private ?? false
  let members: AccountUuid[] =
    space?.members !== undefined ? hierarchy.clone(space.members) : [getCurrentAccount().uuid]
  let owners: AccountUuid[] = space?.owners !== undefined ? hierarchy.clone(space.owners) : [getCurrentAccount().uuid]

  $: isNew = space === undefined

  async function handleSave (): Promise<void> {
    if (isNew) {
      await create()
    } else {
      await update()
    }
  }

  function getData (): Data<CardSpace> {
    return {
      name,
      description: '',
      private: isPrivate,
      members,
      owners,
      autoJoin,
      archived: false,
      types
    }
  }

  async function update (): Promise<void> {
    if (space === undefined) {
      return
    }

    const data = getData()
    await client.diffUpdate(space, data)

    close()
  }

  async function create (): Promise<void> {
    const teamspaceData = getData()

    const id = await client.createDoc(card.class.CardSpace, core.space.Space, { ...teamspaceData })

    close(id)
  }

  function close (id?: Ref<CardSpace>): void {
    dispatch('close', id)
  }

  function handleOwnersChanged (newOwners: AccountUuid[]): void {
    owners = newOwners

    const newMembersSet = new Set([...members, ...newOwners])
    members = Array.from(newMembersSet)
  }

  function handleMembersChanged (newMembers: AccountUuid[]): void {
    members = newMembers
  }

  let autoJoin = space?.autoJoin ?? false

  $: canSave =
    name.trim().length > 0 &&
    !(members.length === 0 && isPrivate) &&
    owners.length > 0 &&
    (!isPrivate || owners.some((o) => members.includes(o)))
</script>

<Card
  label={core.string.Space}
  okLabel={isNew ? presentation.string.Create : presentation.string.Save}
  okAction={handleSave}
  {canSave}
  accentHeader
  width={'medium'}
  gap={'gapV-6'}
  onCancel={close}
  on:changeContent
>
  <div class="antiGrid">
    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={core.string.Name} />
      </div>
      <div class="padding">
        <EditBox id="teamspace-title" bind:value={name} placeholder={core.string.Name} kind={'large-style'} autoFocus />
      </div>
    </div>
  </div>

  <div class="antiGrid">
    <div class="antiGrid-row">
      <div class="antiGrid-row__header withDesciption">
        <Label label={card.string.MasterTags} />
      </div>
      <TypesSelector bind:value={types} />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header withDesciption">
        <Label label={presentation.string.MakePrivate} />
        <span><Label label={presentation.string.MakePrivateDescription} /></span>
      </div>
      <Toggle id={'teamspace-private'} bind:on={isPrivate} disabled={!isPrivate && members.length === 0} />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={core.string.Owners} />
      </div>
      <AccountArrayEditor
        value={owners}
        label={core.string.Owners}
        onChange={handleOwnersChanged}
        kind={'regular'}
        size={'large'}
      />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={core.string.Members} />
      </div>
      <AccountArrayEditor
        value={members}
        allowGuests
        label={core.string.Members}
        onChange={handleMembersChanged}
        kind={'regular'}
        size={'large'}
      />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header withDesciption">
        <Label label={core.string.AutoJoin} />
        <span><Label label={core.string.AutoJoinDescr} /></span>
      </div>
      <Toggle id={'teamspace-autoJoin'} bind:on={autoJoin} />
    </div>
  </div>
</Card>
