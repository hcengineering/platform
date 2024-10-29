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
	import { AccountArrayEditor } from '@hcengineering/contact-resources'
	import core, {
	  Account,
	  getCurrentAccount,
	  Ref,
	  Role,
	  RolesAssignment,
	  SpaceType,
	  WithLookup
	} from '@hcengineering/core'
	import { TestProject } from '@hcengineering/test-management'
	import presentation, { getClient, SpaceCreateCard } from '@hcengineering/presentation'
	import task, { ProjectType } from '@hcengineering/task'
	import ui, { Component, EditBox, Label, Toggle, ToggleWithLabel } from '@hcengineering/ui'
	import { deepEqual } from 'fast-equals'
	import { createEventDispatcher } from 'svelte'
  
	import testManagementResources from '../../plugin'
  
	export let project: TestProject | undefined = undefined
	const dispatch = createEventDispatcher()
  
	const client = getClient()
	const hierarchy = client.getHierarchy()
  
	$: isNew = !project
  
	let name: string = project?.name ?? ''
	const description: string = project?.description ?? ''
	let typeId: Ref<ProjectType> | undefined = project?.type
	let spaceType: WithLookup<SpaceType> | undefined
	let rolesAssignment: RolesAssignment = {}
	let isPrivate: boolean = project?.private ?? false
  
	let members: Ref<Account>[] =
	  project?.members !== undefined ? hierarchy.clone(project.members) : [getCurrentAccount()._id]
	let owners: Ref<Account>[] = project?.owners !== undefined ? hierarchy.clone(project.owners) : [getCurrentAccount()._id]
  
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
	  if (project === undefined || spaceType?.targetClass === undefined || spaceType?.$lookup?.roles === undefined) {
		return {}
	  }
  
	  const asMixin = hierarchy.as(project, spaceType?.targetClass)
  
	  return spaceType.$lookup.roles.reduce<RolesAssignment>((prev, { _id }) => {
		prev[_id as Ref<Role>] = (asMixin as any)[_id] ?? []
  
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
  
	  const funnelId = await client.createDoc(testManagementResources.class.TestProject, core.space.Space, {
		name,
		description,
		private: isPrivate,
		archived: false,
		members,
		autoJoin,
		owners,
		type: typeId
	  })
  
	  // Create space type's mixin with roles assignments
	  await client.createMixin(funnelId, testManagementResources.class.TestProject, core.space.Space, spaceType.targetClass, rolesAssignment)
	}
  
	async function save (): Promise<void> {
	  if (isNew) {
		await createFunnel()
	  } else if (project !== undefined && spaceType?.targetClass !== undefined) {
		await client.diffUpdate<TestProject>(
		  project,
		  { name, description, members, owners, private: isPrivate, autoJoin },
		  Date.now()
		)
  
		if (!deepEqual(rolesAssignment, getRolesAssignment())) {
		  await client.updateMixin(
			project._id,
			testManagementResources.class.TestProject,
			core.space.Space,
			spaceType.targetClass,
			rolesAssignment
		  )
		}
	  }
	}
  
	function handleOwnersChanged (newOwners: Ref<Account>[]): void {
	  owners = newOwners
  
	  const newMembersSet = new Set([...members, ...newOwners])
	  members = Array.from(newMembersSet)
	}
  
	function handleMembersChanged (newMembers: Ref<Account>[]): void {
	  membersChanged = true
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
	  name.trim().length > 0 && members.length > 0 && owners.length > 0 && owners.some((o) => members.includes(o))
  
	let autoJoin = project?.autoJoin ?? spaceType?.autoJoin ?? false
  
	$: setDefaultMembers(spaceType)
  
	let membersChanged: boolean = false
  
	function setDefaultMembers (typeType: SpaceType | undefined): void {
	  if (typeType === undefined) return
	  if (membersChanged) return
	  if (project !== undefined) return
	  autoJoin = typeType.autoJoin ?? false
	  if (typeType.members === undefined || typeType.members.length === 0) return
	  members = typeType.members
	}
  </script>
  
  <SpaceCreateCard
	label={project ? testManagementResources.string.EditProject : testManagementResources.string.CreateProject}
	okAction={save}
	okLabel={!isNew ? ui.string.Save : undefined}
	{canSave}
	on:close={() => {
	  dispatch('close')
	}}
  >
	<div class="antiGrid-row">
	  <EditBox label={testManagementResources.string.ProjectName} bind:value={name} placeholder={testManagementResources.string.ProjectName} autoFocus />
	</div>
  
	<div class="antiGrid-row">
	  <ToggleWithLabel
		label={presentation.string.MakePrivate}
		description={presentation.string.MakePrivateDescription}
		bind:on={isPrivate}
	  />
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
		<Label label={testManagementResources.string.Members} />
	  </div>
	  <AccountArrayEditor
		value={members}
		allowGuests
		label={testManagementResources.string.Members}
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
	  <Toggle bind:on={autoJoin} />
	</div>
  
	{#each roles as role}
	  <div class="antiGrid-row">
		<div class="antiGrid-row__header">
		  <Label label={testManagementResources.string.RoleLabel} params={{ role: role.name }} />
		</div>
		<AccountArrayEditor
		  value={rolesAssignment?.[role._id] ?? []}
		  label={testManagementResources.string.ProjectMembers}
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
  