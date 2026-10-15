<!--
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { Analytics } from '@hcengineering/analytics'
  import core, { AccountUuid, Ref, Role, RolesAssignment, SpaceType, TypedSpace, WithLookup } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import { Breadcrumb, Header, Label, Scroller, SettingsCard, SettingsCardsLayout } from '@hcengineering/ui'

  import setting from '../plugin'

  export let embedded = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let space: TypedSpace
  let spaceType: WithLookup<SpaceType>

  const spaceQuery = createQuery()
  spaceQuery.query(
    core.class.TypedSpace,
    {
      _id: core.space.Space
    },
    (res) => {
      space = res[0]
    }
  )

  const typeQuery = createQuery()
  $: if (space?.type !== undefined) {
    typeQuery.query(
      core.class.SpaceType,
      {
        _id: core.spaceType.SpacesType
      },
      (res) => {
        spaceType = res[0]
      },
      {
        lookup: {
          _id: { roles: core.class.Role }
        }
      }
    )
  }
  $: roles = (spaceType?.$lookup?.roles ?? []) as Role[]

  let rolesAssignment: RolesAssignment = {}
  $: {
    if (space !== undefined && spaceType?.targetClass !== undefined) {
      const asMixin = hierarchy.as(space, spaceType?.targetClass)

      rolesAssignment = roles.reduce<RolesAssignment>((prev, { _id }) => {
        prev[_id] = (asMixin as any)[_id] ?? []

        return prev
      }, {})
    }
  }

  async function handleRoleAssignmentChanged (roleId: Ref<Role>, newMembers: AccountUuid[]): Promise<void> {
    await client.updateMixin(space._id, space._class, core.space.Space, spaceType.targetClass, {
      [roleId]: newMembers
    })
  }

  function handleRoleAssignmentError (error: unknown): void {
    Analytics.handleError(error instanceof Error ? error : new Error(String(error)))
  }
</script>

<div class="hulyComponent">
  {#if !embedded}
    <Header adaptive={'disabled'}>
      <Breadcrumb icon={setting.icon.Privacy} label={setting.string.SpaceRoles} size="large" isCurrent />
    </Header>
  {/if}
  <div class="hulyComponent-content__column content">
    <Scroller align={'center'} padding={'var(--spacing-4)'}>
      <SettingsCardsLayout columns={1}>
        <SettingsCard label={setting.string.SpaceRoles}>
          {#each roles as role (role._id)}
            <div class="antiGrid-row">
              <div class="antiGrid-row__header">
                {role.name}
              </div>
              <AccountArrayEditor
                value={rolesAssignment?.[role._id] ?? []}
                label={core.string.Members}
                onChange={(refs) => {
                  handleRoleAssignmentChanged(role._id, refs).catch(handleRoleAssignmentError)
                }}
                kind="regular"
                size="large"
              />
            </div>
          {:else}
            <div class="emptyState"><Label label={presentation.string.NoResults} /></div>
          {/each}
        </SettingsCard>
      </SettingsCardsLayout>
    </Scroller>
  </div>
</div>

<style lang="scss">
  .content {
    min-height: 0;
  }
  .emptyState {
    color: var(--theme-caption-color);
  }
  .antiGrid-row + .antiGrid-row {
    margin-top: var(--spacing-3);
  }
</style>
