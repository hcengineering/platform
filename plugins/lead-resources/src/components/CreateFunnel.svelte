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
  import { deepEqual } from 'fast-equals'
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import core, {
    Account,
    getCurrentAccount,
    Ref,
    Role,
    RolesAssignment,
    SortingOrder,
    SpaceType,
    WithLookup
  } from '@hcengineering/core'
  import lead, { Funnel } from '@hcengineering/lead'
  import presentation, { createQuery, getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import task, { ProjectType } from '@hcengineering/task'
  import ui, { Component, EditBox, Grid, Label, ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import leadRes from '../plugin'

  export let funnel: Funnel | undefined = undefined
  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: isNew = !funnel

  let name: string = funnel?.name ?? ''
  const description: string = funnel?.description ?? ''
  let typeId: Ref<ProjectType> | undefined = funnel?.type ?? lead.template.DefaultFunnel
  let spaceType: WithLookup<SpaceType> | undefined
  let rolesAssignment: RolesAssignment = {}
  let isPrivate: boolean = funnel?.private ?? false

  let members: Ref<Account>[] =
    funnel?.members !== undefined ? hierarchy.clone(funnel.members) : [getCurrentAccount()._id]

  $: void loadSpaceType(typeId)
  async function loadSpaceType (id: typeof typeId): Promise<void> {
    spaceType =
      id !== undefined
        ? await client
          .getModel()
          .findOne(core.class.SpaceType, { _id: id }, { lookup: { _id: { roles: core.class.Role } } })
        : undefined

    if (spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return
    }

    rolesAssignment = getRolesAssignment()
  }

  $: roles = (spaceType?.$lookup?.roles ?? []) as Role[]

  function getRolesAssignment (): RolesAssignment {
    if (funnel === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return {}
    }

    const asMixin = hierarchy.as(funnel, spaceType?.targetClass)

    return spaceType.$lookup.roles.reduce<RolesAssignment>((prev, { _id }) => {
      prev[_id as Ref<Role>] = (asMixin as any)[_id]

      return prev
    }, {})
  }

  export function canClose (): boolean {
    return name === '' && typeId !== undefined
  }

  async function createFunnel (): Promise<void> {
    if (typeId === undefined || spaceType?.targetClass === undefined) {
      return
    }

    const funnelId = await client.createDoc(leadRes.class.Funnel, core.space.Space, {
      name,
      description,
      private: isPrivate,
      archived: false,
      members,
      type: typeId
    })

    // Create space type's mixin with roles assignments
    await client.createMixin(funnelId, leadRes.class.Funnel, core.space.Space, spaceType.targetClass, rolesAssignment)
  }

  async function save (): Promise<void> {
    if (isNew) {
      await createFunnel()
    } else if (funnel !== undefined && spaceType?.targetClass !== undefined) {
      await client.diffUpdate<Funnel>(funnel, { name, description, members, private: isPrivate }, Date.now())

      if (!deepEqual(rolesAssignment, getRolesAssignment())) {
        await client.updateMixin(
          funnel._id,
          leadRes.class.Funnel,
          core.space.Space,
          spaceType.targetClass,
          rolesAssignment
        )
      }
    }
  }

  function handleMembersChanged (newMembers: Ref<Account>[]): void {
    // If a member was removed we need to remove it from any roles assignments as well
    const newMembersSet = new Set(newMembers)
    const removedMembersSet = new Set(members.filter((m) => !newMembersSet.has(m)))

    if (removedMembersSet.size > 0 && rolesAssignment !== undefined) {
      for (const [key, value] of Object.entries(rolesAssignment)) {
        rolesAssignment[key as Ref<Role>] =
          value !== undefined ? value.filter((m) => !removedMembersSet.has(m)) : undefined
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
</script>

<SpaceCreateCard
  label={leadRes.string.CreateFunnel}
  okAction={save}
  okLabel={!isNew ? ui.string.Save : undefined}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={leadRes.string.FunnelName} bind:value={name} placeholder={leadRes.string.FunnelName} autoFocus />
    <ToggleWithLabel
      label={presentation.string.MakePrivate}
      description={presentation.string.MakePrivateDescription}
      bind:on={isPrivate}
    />

    <Component
      is={task.component.ProjectTypeSelector}
      disabled={!isNew}
      props={{
        descriptors: [leadRes.descriptors.FunnelType],
        type: typeId,
        disabled: funnel !== undefined
      }}
      on:change={(evt) => {
        typeId = evt.detail
      }}
    />
  </Grid>
  <div class="antiGrid-row mt-4">
    <div class="antiGrid-row__header">
      <Label label={leadRes.string.Members} />
    </div>
    <AccountArrayEditor
      value={members}
      label={leadRes.string.Members}
      onChange={handleMembersChanged}
      kind={'regular'}
      size={'large'}
    />
  </div>

  {#each roles as role}
    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={leadRes.string.RoleLabel} params={{ role: role.name }} />
      </div>
      <AccountArrayEditor
        value={rolesAssignment?.[role._id] ?? []}
        label={leadRes.string.FunnelMembers}
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
</SpaceCreateCard>
