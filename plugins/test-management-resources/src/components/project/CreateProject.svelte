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
  import { Asset } from '@hcengineering/platform'
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
  import view from '@hcengineering/view'
  import testManagement, { TestProject } from '@hcengineering/test-management'
  import presentation, { Card, getClient, reduceCalls } from '@hcengineering/presentation'
  import {
    Button,
    EditBox,
    IconWithEmoji,
    Label,
    Toggle,
    getColorNumberByText,
    showPopup,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    themeStore
  } from '@hcengineering/ui'
  import { IconPicker, SpaceTypeSelector } from '@hcengineering/view-resources'

  import testManagementRes from '../../plugin'

  export let project: TestProject | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let name: string = project?.name ?? ''
  let description: string = project?.description ?? ''
  let isPrivate: boolean = project?.private ?? false
  let icon: Asset | undefined = project?.icon ?? undefined
  let color = project?.color ?? getColorNumberByText(name)
  let isColorSelected = false

  let members: AccountUuid[] =
    project?.members !== undefined ? hierarchy.clone(project.members) : [getCurrentAccount().uuid]
  $: membersPersons = members.map((m) => $personRefByAccountUuidStore.get(m)).filter(notEmpty)
  let owners: AccountUuid[] =
    project?.owners !== undefined ? hierarchy.clone(project.owners) : [getCurrentAccount().uuid]
  let rolesAssignment: RolesAssignment = {}

  let typeId: Ref<SpaceType> | undefined = project?.type ?? testManagementRes.spaceType.DefaultProject
  let spaceType: WithLookup<SpaceType> | undefined

  $: void loadSpaceType(typeId)
  const loadSpaceType = reduceCalls(async (id: typeof typeId): Promise<void> => {
    spaceType =
      id !== undefined
        ? await client
          .getModel()
          .findOne(core.class.SpaceType, { _id: id }, { lookup: { _id: { roles: core.class.Role } } })
        : undefined

    if (project === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return
    }

    rolesAssignment = getRolesAssignment()
  })

  function getRolesAssignment (): RolesAssignment {
    if (project === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
      return {}
    }

    const asMixin = hierarchy.as(project, spaceType?.targetClass)

    return spaceType.$lookup.roles.reduce<RolesAssignment>((prev, { _id }) => {
      prev[_id as Ref<Role>] = (asMixin as any)[_id] ?? []

      return prev
    }, {})
  }

  async function handleSave (): Promise<void> {
    if (project === undefined) {
      await createTestProject()
    } else {
      await updateTestProject()
    }
  }

  function getTestProjectData (): Omit<Data<TestProject>, 'type'> {
    return {
      name,
      description,
      private: isPrivate,
      icon,
      color,
      members,
      owners,
      archived: false
    }
  }

  async function updateTestProject (): Promise<void> {
    if (project === undefined || spaceType?.targetClass === undefined) {
      return
    }

    const data = getTestProjectData()
    const update: DocumentUpdate<TestProject> = {}
    if (data.name !== project?.name) {
      update.name = data.name
    }
    if (data.description !== project?.description) {
      update.description = data.description
    }
    if (data.private !== project?.private) {
      update.private = data.private
    }
    if (data.icon !== project?.icon) {
      update.icon = data.icon
    }
    if (data.color !== project?.color) {
      update.color = data.color
    }
    if (data.members.length !== project?.members.length) {
      update.members = data.members
    } else {
      for (const member of data.members) {
        if (project.members.findIndex((p) => p === member) === -1) {
          update.members = data.members
          break
        }
      }
    }
    if (data.owners?.length !== project?.owners?.length) {
      update.owners = data.owners
    } else {
      for (const owner of data.owners ?? []) {
        if (project.owners?.findIndex((p) => p === owner) === -1) {
          update.owners = data.owners
          break
        }
      }
    }

    if (Object.keys(update).length > 0) {
      await client.update(project, update)
    }

    if (!deepEqual(rolesAssignment, getRolesAssignment())) {
      await client.updateMixin(
        project._id,
        testManagementRes.class.TestProject,
        core.space.Space,
        spaceType.targetClass,
        rolesAssignment
      )
    }

    close()
  }

  async function createTestProject (): Promise<void> {
    if (typeId === undefined || spaceType?.targetClass === undefined) {
      return
    }

    const projectId = generateId<TestProject>()
    const projectData = getTestProjectData()

    await client.createDoc(
      testManagementRes.class.TestProject,
      core.space.Space,
      { ...projectData, type: typeId },
      projectId
    )

    // Create space type's mixin with roles assignments
    await client.createMixin(
      projectId,
      testManagementRes.class.TestProject,
      core.space.Space,
      spaceType.targetClass,
      rolesAssignment
    )
    // TODO: Analytics.handleEvent(TestProjectEvents.TestProjectCreated, { id: projectId })
    close(projectId)
  }

  function close (id?: Ref<TestProject>): void {
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

  function chooseIcon (ev: MouseEvent): void {
    const icons = [testManagement.icon.Home, testManagement.icon.RedCircle]
    const update = (result: any): void => {
      if (result !== undefined && result !== null) {
        icon = result.icon
        color = result.color
        isColorSelected = true
      }
    }
    showPopup(IconPicker, { icon, color, icons }, 'top', update, update)
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
  label={project ? testManagementRes.string.EditProject : testManagementRes.string.CreateProject}
  okLabel={project ? presentation.string.Save : presentation.string.Create}
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
        disabled={project !== undefined}
        descriptors={[testManagementRes.descriptors.ProjectType]}
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
        <Label label={testManagementRes.string.ChooseIcon} />
      </div>
      <Button
        icon={icon === view.ids.IconWithEmoji ? IconWithEmoji : icon ?? testManagement.icon.Home}
        iconProps={icon === view.ids.IconWithEmoji
          ? { icon: color, size: 'medium' }
          : {
              fill:
                color !== undefined
                  ? getPlatformColorDef(color, $themeStore.dark).icon
                  : getPlatformColorForTextDef(name, $themeStore.dark).icon
            }}
        size={'large'}
        on:click={chooseIcon}
      />
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
            <Label label={testManagementRes.string.RoleLabel} params={{ role: role.name }} />
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
  </div></Card
>
