<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import { AccountArrayEditor, personRefByAccountUuidStore } from '@hcengineering/contact-resources'
  import core, {
    Data,
    DocumentUpdate,
    RolesAssignment,
    Ref,
    Role,
    SpaceType,
    generateId,
    getCurrentAccount,
    WithLookup,
    notEmpty,
    AccountUuid
  } from '@hcengineering/core'
  import { Drive, DriveEvents } from '@hcengineering/drive'
  import presentation, { Card, getClient, reduceCalls } from '@hcengineering/presentation'
  import { EditBox, Label, Toggle } from '@hcengineering/ui'
  import { SpaceTypeSelector } from '@hcengineering/view-resources'

  import driveRes from '../plugin'
  import { Analytics } from '@hcengineering/analytics'

  export let drive: Drive | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let name: string = drive?.name ?? ''
  let description: string = drive?.description ?? ''
  let isPrivate: boolean = drive?.private ?? false

  let members: AccountUuid[] =
    drive?.members !== undefined ? hierarchy.clone(drive.members) : [getCurrentAccount().uuid]
  let owners: AccountUuid[] = drive?.owners !== undefined ? hierarchy.clone(drive.owners) : [getCurrentAccount().uuid]
  let rolesAssignment: RolesAssignment = {}

  let typeId: Ref<SpaceType> | undefined = drive?.type ?? driveRes.spaceType.DefaultDrive
  let spaceType: WithLookup<SpaceType> | undefined

  $: membersPersons = members.map((m) => $personRefByAccountUuidStore.get(m)).filter(notEmpty)
  $: void loadSpaceType(typeId)
  const loadSpaceType = reduceCalls(async (id: typeof typeId): Promise<void> => {
    spaceType =
      id !== undefined
        ? await client
          .getModel()
          .findOne(core.class.SpaceType, { _id: id }, { lookup: { _id: { roles: core.class.Role } } })
        : undefined

    if (drive === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return
    }

    rolesAssignment = getRolesAssignment()
  })

  function getRolesAssignment (): RolesAssignment {
    if (drive === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return {}
    }

    const asMixin = hierarchy.as(drive, spaceType?.targetClass)

    return spaceType.$lookup.roles.reduce<RolesAssignment>((prev, { _id }) => {
      prev[_id as Ref<Role>] = (asMixin as any)[_id] ?? []

      return prev
    }, {})
  }

  async function handleSave (): Promise<void> {
    if (drive === undefined) {
      await createDrive()
    } else {
      await updateDrive()
    }
  }

  function getDriveData (): Omit<Data<Drive>, 'type'> {
    return {
      name,
      description,
      private: isPrivate,
      members,
      owners,
      archived: false
    }
  }

  async function updateDrive (): Promise<void> {
    if (drive === undefined || spaceType?.targetClass === undefined) {
      return
    }

    const data = getDriveData()
    const update: DocumentUpdate<Drive> = {}
    if (data.name !== drive?.name) {
      update.name = data.name
    }
    if (data.description !== drive?.description) {
      update.description = data.description
    }
    if (data.private !== drive?.private) {
      update.private = data.private
    }
    if (data.members.length !== drive?.members.length) {
      update.members = data.members
    } else {
      for (const member of data.members) {
        if (drive.members.findIndex((p) => p === member) === -1) {
          update.members = data.members
          break
        }
      }
    }
    if (data.owners?.length !== drive?.owners?.length) {
      update.owners = data.owners
    } else {
      for (const owner of data.owners ?? []) {
        if (drive.owners?.findIndex((p) => p === owner) === -1) {
          update.owners = data.owners
          break
        }
      }
    }

    if (Object.keys(update).length > 0) {
      await client.update(drive, update)
    }

    if (!deepEqual(rolesAssignment, getRolesAssignment())) {
      await client.updateMixin(
        drive._id,
        driveRes.class.Drive,
        core.space.Space,
        spaceType.targetClass,
        rolesAssignment
      )
    }

    close()
  }

  async function createDrive (): Promise<void> {
    if (typeId === undefined || spaceType?.targetClass === undefined) {
      return
    }

    const driveId = generateId<Drive>()
    const driveData = getDriveData()

    await client.createDoc(driveRes.class.Drive, core.space.Space, { ...driveData, type: typeId }, driveId)

    // Create space type's mixin with roles assignments
    await client.createMixin(driveId, driveRes.class.Drive, core.space.Space, spaceType.targetClass, rolesAssignment)
    Analytics.handleEvent(DriveEvents.DriveCreated, { id: driveId })
    close(driveId)
  }

  function close (id?: Ref<Drive>): void {
    dispatch('close', id)
  }

  function handleTypeChange (evt: CustomEvent<Ref<SpaceType>>): void {
    typeId = evt.detail
  }

  $: roles = (spaceType?.$lookup?.roles ?? []) as Role[]

  function handleOwnersChanged (newOwners: AccountUuid[]): void {
    owners = newOwners

    const newMembersSet = new Set([...members, ...newOwners])
    members = Array.from(newMembersSet)
  }

  function handleMembersChanged (newMembers: AccountUuid[]): void {
    // If a member was removed we need to remove it from any roles assignments as well
    const newMembersSet = new Set(newMembers)
    const removedMembersSet = new Set(members.filter((m) => !newMembersSet.has(m)))

    if (removedMembersSet.size > 0 && rolesAssignment !== undefined) {
      for (const [key, value] of Object.entries(rolesAssignment)) {
        rolesAssignment[key as Ref<Role>] = value != null ? value.filter((m) => !removedMembersSet.has(m)) : undefined
      }
    }

    members = newMembers
  }

  function handleRoleAssignmentChanged (roleId: Ref<Role>, newMembers: AccountUuid[]): void {
    if (rolesAssignment === undefined) {
      rolesAssignment = {}
    }

    rolesAssignment[roleId] = newMembers
  }

  $: canSave =
    name.trim().length > 0 &&
    !(members.length === 0 && isPrivate) &&
    typeId !== undefined &&
    spaceType?.targetClass !== undefined &&
    owners.length > 0 &&
    (!isPrivate || owners.some((o) => members.includes(o)))
</script>

<Card
  label={drive ? driveRes.string.EditDrive : driveRes.string.CreateDrive}
  okLabel={drive ? presentation.string.Save : presentation.string.Create}
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
        <Label label={core.string.SpaceType} />
      </div>

      <SpaceTypeSelector
        disabled={drive !== undefined}
        descriptors={[driveRes.descriptor.DriveType]}
        type={typeId}
        focusIndex={4}
        kind="regular"
        size="large"
        on:change={handleTypeChange}
      />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={core.string.Name} />
      </div>
      <div class="padding">
        <EditBox id="teamspace-title" bind:value={name} placeholder={core.string.Name} kind={'large-style'} autoFocus />
      </div>
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header topAlign">
        <Label label={core.string.Description} />
      </div>
      <div class="padding">
        <EditBox id="teamspace-description" bind:value={description} placeholder={core.string.Description} />
      </div>
    </div>
  </div>

  <div class="antiGrid">
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
      <div class="antiGrid-row__header withDesciption">
        <Label label={presentation.string.MakePrivate} />
        <span><Label label={presentation.string.MakePrivateDescription} /></span>
      </div>
      <Toggle bind:on={isPrivate} disabled={!isPrivate && members.length === 0} />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={core.string.Members} />
      </div>
      <AccountArrayEditor
        value={members}
        label={core.string.Members}
        onChange={handleMembersChanged}
        kind={'regular'}
        size={'large'}
        allowGuests
      />
    </div>

    {#each roles as role}
      <div class="antiGrid-row">
        <div class="antiGrid-row__header">
          <Label label={driveRes.string.RoleLabel} params={{ role: role.name }} />
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
