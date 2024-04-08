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
  import { AttributeEditor, createQuery, getClient } from '@hcengineering/presentation'
  import core, { Permission, Ref, Role, SpaceType, SpaceTypeDescriptor, WithLookup } from '@hcengineering/core'
  import { ButtonIcon, Icon, IconEdit, IconSettings, Label, Scroller, showPopup } from '@hcengineering/ui'
  import { ObjectBoxPopup } from '@hcengineering/view-resources'

  import PersonIcon from '../icons/Person.svelte'
  import settingRes from '../../plugin'

  export let spaceType: SpaceType
  export let descriptor: SpaceTypeDescriptor
  export let objectId: Ref<Role>
  export let name: string | undefined

  const client = getClient()

  let role: Role | undefined
  const roleQuery = createQuery()
  $: roleQuery.query(core.class.Role, { _id: objectId }, (res) => {
    ;[role] = res
  })
  $: name = role?.name

  let permissions: Permission[] = []
  const permissionsQuery = createQuery()
  $: if (role !== undefined) {
    permissionsQuery.query(core.class.Permission, { _id: { $in: role.permissions } }, (res) => {
      permissions = res
    })
  }

  function handleEditPermissions (evt: Event): void {
    if (role === undefined || descriptor === undefined) {
      return
    }

    showPopup(
      ObjectBoxPopup,
      {
        _class: core.class.Permission,
        docQuery: { _id: { $in: descriptor.availablePermissions } },
        multiSelect: true,
        allowDeselect: true,
        selectedObjects: role.permissions
      },
      evt.target as HTMLElement,
      undefined,
      async (result) => {
        if (role === undefined) {
          return
        }

        await client.updateCollection(
          core.class.Role,
          core.space.Model,
          role._id,
          spaceType._id,
          spaceType._class,
          'roles',
          {
            permissions: result
          }
        )
      }
    )
  }
</script>

{#if role !== undefined}
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content gap">
          <div class="hulyComponent-content__column-group mt-4">
            <div class="hulyComponent-content__header mb-6">
              <ButtonIcon icon={PersonIcon} size="large" iconProps={{ size: 'small' }} kind="secondary" />
              <AttributeEditor _class={core.class.Role} object={role} key="name" editKind="modern-ghost-large" />
            </div>

            <div class="hulyTableAttr-container">
              <div class="hulyTableAttr-header font-medium-12">
                <IconSettings size="small" />
                <span><Label label={settingRes.string.Permissions} /></span>
                <ButtonIcon kind="primary" icon={IconEdit} size="small" on:click={handleEditPermissions} />
              </div>

              {#if permissions.length > 0}
                <div class="hulyTableAttr-content task">
                  {#each permissions as permission}
                    <div class="hulyTableAttr-content__row">
                      {#if permission.icon !== undefined}
                        <div class="hulyTableAttr-content__row-icon-wrapper">
                          <Icon icon={permission.icon} size="small" />
                        </div>
                      {/if}

                      <div class="hulyTableAttr-content__row-label font-medium-14">
                        <Label label={permission.label} />
                      </div>

                      {#if permission.description !== undefined}
                        <div class="hulyTableAttr-content__row-label grow dark font-regular-14">
                          <Label label={permission.description} />
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </Scroller>
    </div>
  </div>
{/if}
