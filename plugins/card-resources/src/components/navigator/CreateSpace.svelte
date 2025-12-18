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
  import { AccountArrayEditor, employeeRefByAccountUuidStore } from '@hcengineering/contact-resources'
  import core, { AccountUuid, Data, Ref, RolesAssignment, getCurrentAccount, notEmpty } from '@hcengineering/core'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { CardSpace, MasterTag, Role } from '@hcengineering/card'
  import card from '../../plugin'
  import TypesSelector from './TypesSelector.svelte'
  import view from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'

  export let space: CardSpace | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const topLevelTypes = client.getModel().findAllSync(card.class.MasterTag, {
    extends: card.class.Card,
    removed: { $ne: true }
  })

  let types: Ref<MasterTag>[] =
    space?.types !== undefined ? hierarchy.clone(space.types) : topLevelTypes.map((it) => it._id)

  let roles = client.getModel().findAllSync(card.class.Role, { types: { $in: types } })
  $: roles = client.getModel().findAllSync(card.class.Role, { types: { $in: types } })

  let name: string = space?.name ?? ''

  let isPrivate: boolean = space?.private ?? false
  let restricted: boolean = space?.restricted ?? false
  let members: AccountUuid[] =
    space?.members !== undefined ? hierarchy.clone(space.members) : [getCurrentAccount().uuid]
  let owners: AccountUuid[] = space?.owners !== undefined ? hierarchy.clone(space.owners) : [getCurrentAccount().uuid]

  $: isNew = space === undefined

  let rolesAssignment = getRolesAssignment(roles)
  $: rolesAssignment = getRolesAssignment(roles)

  function getRolesAssignment (roles: Role[]): RolesAssignment {
    if (space === undefined || roles === undefined) {
      return {}
    }

    const asMixin = hierarchy.as(space, core.mixin.SpacesTypeData)

    const res = roles.reduce<RolesAssignment>((prev, { _id }) => {
      prev[_id] = (asMixin as any)[_id] ?? []

      return prev
    }, {})
    return res
  }

  function getCurrentRolesAssignment (): RolesAssignment {
    if (space === undefined) {
      return {}
    }

    const asMixin = hierarchy.as(space, core.mixin.SpacesTypeData)
    const allRoles = client.getModel().findAllSync(card.class.Role, {})

    const res: RolesAssignment = {}

    for (const role of allRoles) {
      const curr = (asMixin as any)[role._id]
      if (curr !== undefined) {
        res[role._id] = curr
      }
    }

    return res
  }

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
      type: card.spaceType.SpaceType,
      types,
      restricted
    }
  }

  async function update (): Promise<void> {
    if (space === undefined) {
      return
    }

    const data = getData()
    await client.diffUpdate(space, data)

    if (rolesAssignment && !deepEqual(rolesAssignment, getCurrentRolesAssignment())) {
      await client.updateMixin(space._id, space._class, core.space.Space, core.mixin.SpacesTypeData, rolesAssignment)
    }

    close()
  }

  async function create (): Promise<void> {
    const data = getData()

    const id = await client.createDoc(card.class.CardSpace, core.space.Space, data)

    if (rolesAssignment && !deepEqual(rolesAssignment, getCurrentRolesAssignment())) {
      await client.updateMixin(id, card.class.CardSpace, core.space.Space, core.mixin.SpacesTypeData, rolesAssignment)
    }

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

  $: membersPersons = members.map((m) => $employeeRefByAccountUuidStore.get(m)).filter(notEmpty)

  function handleRoleAssignmentChanged (roleId: Ref<Role>, newMembers: AccountUuid[]): void {
    if (rolesAssignment === undefined) {
      rolesAssignment = {}
    }

    rolesAssignment[roleId] = newMembers
  }
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
      <Toggle id={'space-autoJoin'} bind:on={autoJoin} />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header withDesciption">
        <Label label={core.string.RBAC} />
        <span><Label label={core.string.RBACDescr} /></span>
      </div>
      <Toggle id={'space-restricted'} bind:on={restricted} />
    </div>

    {#each roles as role}
      <div class="antiGrid-row">
        <div class="antiGrid-row__header">
          <Label label={view.string.RoleLabel} params={{ role: role.name }} />
        </div>
        <AccountArrayEditor
          value={rolesAssignment?.[role._id] ?? []}
          label={core.string.Members}
          includeItems={membersPersons}
          readonly={membersPersons.length === 0}
          onChange={(refs) => {
            handleRoleAssignmentChanged(role._id, refs)
          }}
          kind={'regular'}
          size={'large'}
        />
      </div>
    {/each}
  </div>
</Card>
