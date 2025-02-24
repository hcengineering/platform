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
  import core, { Role, SortingOrder, SpaceType, SpaceTypeDescriptor } from '@hcengineering/core'
  import { ButtonIcon, IconAdd, Label, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import { createQuery } from '@hcengineering/presentation'

  import MembersIcon from '../../icons/Members.svelte'
  import PersonIcon from '../../icons/Person.svelte'
  import CreateRole from './CreateRole.svelte'
  import { clearSettingsStore, settingsStore } from '../../../store'
  import settingRes from '../../../plugin'

  export let type: SpaceType | undefined
  export let descriptor: SpaceTypeDescriptor | undefined
  export let disabled: boolean = true

  let roles: Role[] = []
  const rolesQuery = createQuery()
  $: if (type !== undefined) {
    rolesQuery.query(
      core.class.Role,
      { attachedTo: type._id },
      (res) => {
        roles = res
      },
      { sort: { _id: SortingOrder.Ascending } }
    )
  }

  function handleRoleSelected (id: string | undefined): void {
    const loc = getCurrentResolvedLocation()
    if (id !== undefined) {
      loc.path[5] = 'roles'
      loc.path[6] = id
      loc.path.length = 7
    } else {
      loc.path.length = 5
    }

    clearSettingsStore()
    navigate(loc)
  }
</script>

{#if descriptor !== undefined}
  <div class="hulyTableAttr-header font-medium-12">
    <MembersIcon size="small" />
    <span><Label label={settingRes.string.Roles} /></span>
    <ButtonIcon
      kind="primary"
      icon={IconAdd}
      size="small"
      dataId={'btnAdd'}
      {disabled}
      on:click={(ev) => {
        $settingsStore = { id: 'createRole', component: CreateRole, props: { type, descriptor } }
      }}
    />
  </div>
  {#if roles.length}
    <div class="hulyTableAttr-content task">
      {#each roles as role}
        <button
          class="hulyTableAttr-content__row justify-start"
          on:click|stopPropagation={() => {
            handleRoleSelected(role._id)
          }}
        >
          <div class="hulyTableAttr-content__row-icon-wrapper">
            <PersonIcon size="small" />
          </div>
          {#if role.name !== ''}
            <div class="hulyTableAttr-content__row-label font-medium-14">
              {role.name}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
{/if}
