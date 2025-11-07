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
  import core, { Permission, Ref } from '@hcengineering/core'
  import { AttributeEditor, MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import {
    ButtonIcon,
    Icon,
    IconDelete,
    IconEdit,
    IconSettings,
    Label,
    Scroller,
    getCurrentResolvedLocation,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import contact from '@hcengineering/contact'
  import { ObjectBoxPopup } from '@hcengineering/view-resources'

  import cardPlugin from '../../plugin'
  import { MasterTag, Role } from '@hcengineering/card'
  import settingRes from '@hcengineering/setting-resources/src/plugin'
  import { clearSettingsStore } from '@hcengineering/setting-resources'

  export let _id: Ref<Role>
  export let masterTag: MasterTag
  export let readonly: boolean = false

  const client = getClient()
  const h = client.getHierarchy()

  const cardPermissionsObjectClasses = client
    .getModel()
    .findAllSync(cardPlugin.class.PermissionObjectClass, {})
    .map((poc) => poc.objectClass)
  const tagDesc = h.getAncestors(masterTag._id)
  const allPermissions = client.getModel().findAllSync(core.class.Permission, {
    scope: 'space',
    objectClass: { $in: [...cardPermissionsObjectClasses, ...tagDesc] }
  })

  let role: Role | undefined
  const roleQuery = createQuery()
  $: roleQuery.query(cardPlugin.class.Role, { _id }, (res) => {
    ;[role] = res
  })

  let permissions: Permission[] = []
  $: permissions =
    role?.permissions !== undefined ? allPermissions.filter((p) => role?.permissions?.includes(p._id)) : []

  function handleEditPermissions (evt: Event): void {
    if (role === undefined || readonly) {
      return
    }

    showPopup(
      ObjectBoxPopup,
      {
        _class: core.class.Permission,
        docQuery: { _id: { $in: allPermissions.map((p) => p._id) } },
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
          cardPlugin.class.Role,
          core.space.Model,
          _id,
          cardPlugin.spaceType.SpaceType,
          core.class.SpaceType,
          'roles',
          {
            permissions: result
          }
        )
      }
    )
  }

  async function handleDeleteRole (): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: settingRes.string.DeleteRole,
        message: settingRes.string.DeleteRoleConfirmation,
        action: async () => {
          await performDeleteRole()
        }
      },
      'top'
    )
  }

  async function performDeleteRole (): Promise<void> {
    if (role === undefined) {
      return
    }

    const attribute = await client.findOne(core.class.Attribute, { name: _id, attributeOf: cardPlugin.class.CardSpace })
    const ops = client.apply()

    await ops.removeCollection(
      cardPlugin.class.Role,
      core.space.Model,
      _id,
      role.attachedTo,
      role.attachedToClass,
      'roles'
    )
    if (attribute !== undefined) {
      const mixins = await client.findAll(cardPlugin.class.CardSpace, {})
      for (const mixin of mixins) {
        await ops.updateMixin(mixin._id, mixin._class, mixin.space, cardPlugin.class.CardSpace, {
          [attribute.name]: undefined
        })
      }

      await ops.remove(attribute)
    }

    // remove all the assignments
    await ops.commit()

    const loc = getCurrentResolvedLocation()
    loc.path.length = 5

    clearSettingsStore()
    navigate(loc)
  }
</script>

{#if role !== undefined}
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content gap">
          <div class="hulyComponent-content__column-group mt-4">
            <div class="hulyComponent-content__header mb-6 gap-2">
              <ButtonIcon
                icon={IconDelete}
                size="large"
                kind="secondary"
                disabled={readonly}
                on:click={handleDeleteRole}
              />
              <ButtonIcon
                icon={contact.icon.Person}
                size="large"
                iconProps={{ size: 'small' }}
                kind="secondary"
                disabled={readonly}
              />
              <div class="name" class:editable={!readonly}>
                <AttributeEditor
                  _class={core.class.Role}
                  object={role}
                  key="name"
                  editKind="modern-ghost-large"
                  editable={!readonly}
                />
              </div>
            </div>

            <div class="hulyTableAttr-container">
              <div class="hulyTableAttr-header font-medium-12">
                <IconSettings size="small" />
                <span><Label label={settingRes.string.Permissions} /></span>
                <ButtonIcon
                  kind="primary"
                  icon={IconEdit}
                  size="small"
                  on:click={handleEditPermissions}
                  disabled={readonly}
                />
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

<style lang="scss">
  .name {
    width: 100%;
    font-weight: 500;
    margin-left: 1rem;
    display: flex;
    align-items: center;
    font-size: 1.5rem;

    &.editable {
      margin-left: 0;
    }
  }
</style>
