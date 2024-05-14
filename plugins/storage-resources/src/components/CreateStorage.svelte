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
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import core, {
    Account,
    Data,
    DocumentUpdate,
    RolesAssignment,
    Ref,
    Role,
    SpaceType,
    generateId,
    getCurrentAccount,
    WithLookup
  } from '@hcengineering/core'
  import presentation, { Card, getClient, reduceCalls } from '@hcengineering/presentation'
  import { Storage } from '@hcengineering/storage'
  import { EditBox, Label, Toggle } from '@hcengineering/ui'
  import { SpaceTypeSelector } from '@hcengineering/view-resources'

  import storageRes from '../plugin'

  export let storage: Storage | undefined = undefined
  export let namePlaceholder: string = ''
  export let descriptionPlaceholder: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let name: string = storage?.name ?? namePlaceholder
  let description: string = storage?.description ?? descriptionPlaceholder
  let isPrivate: boolean = storage?.private ?? false

  let members: Ref<Account>[] =
    storage?.members !== undefined ? hierarchy.clone(storage.members) : [getCurrentAccount()._id]
  let owners: Ref<Account>[] =
    storage?.owners !== undefined ? hierarchy.clone(storage.owners) : [getCurrentAccount()._id]
  let rolesAssignment: RolesAssignment = {}

  let typeId: Ref<SpaceType> | undefined = storage?.type ?? storageRes.spaceType.DefaultStorage
  let spaceType: WithLookup<SpaceType> | undefined

  $: void loadSpaceType(typeId)
  const loadSpaceType = reduceCalls(async (id: typeof typeId): Promise<void> => {
    spaceType =
      id !== undefined
        ? await client
          .getModel()
          .findOne(core.class.SpaceType, { _id: id }, { lookup: { _id: { roles: core.class.Role } } })
        : undefined

    if (storage === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return
    }

    rolesAssignment = getRolesAssignment()
  })

  function getRolesAssignment (): RolesAssignment {
    if (storage === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return {}
    }

    const asMixin = hierarchy.as(storage, spaceType?.targetClass)

    return spaceType.$lookup.roles.reduce<RolesAssignment>((prev, { _id }) => {
      prev[_id as Ref<Role>] = (asMixin as any)[_id] ?? []

      return prev
    }, {})
  }

  async function handleSave (): Promise<void> {
    if (storage === undefined) {
      await createStorage()
    } else {
      await updateStorage()
    }
  }

  function getStorageData (): Omit<Data<Storage>, 'type'> {
    return {
      name,
      description,
      private: isPrivate,
      members,
      owners,
      archived: false
    }
  }

  async function updateStorage (): Promise<void> {
    if (storage === undefined) {
      return
    }

    const storageData = getStorageData()
    const update: DocumentUpdate<Storage> = {}
    if (storageData.name !== storage?.name) {
      update.name = storageData.name
    }
    if (storageData.description !== storage?.description) {
      update.description = storageData.description
    }
    if (storageData.private !== storage?.private) {
      update.private = storageData.private
    }
    if (storageData.members.length !== storage?.members.length) {
      update.members = storageData.members
    } else {
      for (const member of storageData.members) {
        if (storage.members.findIndex((p) => p === member) === -1) {
          update.members = storageData.members
          break
        }
      }
    }
    if (storageData.owners?.length !== storage?.owners?.length) {
      update.owners = storageData.owners
    } else {
      for (const owner of storageData.owners ?? []) {
        if (storage.owners?.findIndex((p) => p === owner) === -1) {
          update.owners = storageData.owners
          break
        }
      }
    }

    if (Object.keys(update).length > 0) {
      await client.update(storage, update)
    }

    if (!deepEqual(rolesAssignment, getRolesAssignment())) {
      await client.updateMixin(
        storage._id,
        storageRes.class.Storage,
        core.space.Space,
        rolesAssignment
      )
    }

    close()
  }

  async function createStorage (): Promise<void> {
    if (typeId === undefined || spaceType?.targetClass === undefined) {
      return
    }

    const storageId = generateId<Storage>()
    const storageData = getStorageData()

    await client.createDoc(storageRes.class.Storage, core.space.Space, { ...storageData, type: typeId }, storageId)

    // Create space type's mixin with roles assignments
    await client.createMixin(
      storageId,
      storageRes.class.Storage,
      core.space.Space,
      spaceType.targetClass,
      rolesAssignment
    )

    close(storageId)
  }

  function close (id?: Ref<Storage>): void {
    dispatch('close', id)
  }

  function handleTypeChange (evt: CustomEvent<Ref<SpaceType>>): void {
    typeId = evt.detail
  }

  $: roles = (spaceType?.$lookup?.roles ?? []) as Role[]

  function handleOwnersChanged (newOwners: Ref<Account>[]): void {
    owners = newOwners

    const newMembersSet = new Set([...members, ...newOwners])
    members = Array.from(newMembersSet)
  }

  function handleMembersChanged (newMembers: Ref<Account>[]): void {
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

  function handleRoleAssignmentChanged (roleId: Ref<Role>, newMembers: Ref<Account>[]): void {
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
  label={storage ? storageRes.string.EditStorage : storageRes.string.CreateStorage}
  okLabel={storage ? presentation.string.Create : presentation.string.Save}
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
        disabled={storage !== undefined}
        descriptors={[storageRes.descriptor.StorageType]}
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
        <EditBox
          id="teamspace-title"
          bind:value={name}
          placeholder={core.string.Name}
          kind={'large-style'}
          autoFocus
        />
      </div>
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header topAlign">
        <Label label={core.string.Description} />
      </div>
      <div class="padding">
        <EditBox
          id="teamspace-description"
          bind:value={description}
          placeholder={core.string.Description}
        />
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
      />
    </div>

    {#each roles as role}
      <div class="antiGrid-row">
        <div class="antiGrid-row__header">
          <Label label={storageRes.string.RoleLabel} params={{ role: role.name }} />
        </div>
        <AccountArrayEditor
          value={rolesAssignment?.[role._id] ?? []}
          label={core.string.Members}
          includeItems={members}
          readonly={members.length === 0}
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
