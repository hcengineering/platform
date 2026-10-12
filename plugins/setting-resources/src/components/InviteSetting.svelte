<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import core, { AccountRole, getCurrentAccount, hasAccountRole, type Ref } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { type InviteSettings, type RoleCapabilitySettings, RoleCapability } from '@hcengineering/setting'
  import { hasRoleCapability } from '../roleCapability'
  import { getDefaultInviterRoles, getDefaultInviteRole, resolveInviteSettings } from '../inviteSettingsUtils'
  import { translate } from '@hcengineering/platform'
  import {
    Breadcrumb,
    DropdownLabels,
    DropdownTextItem,
    EditBox,
    Header,
    Label,
    Loading,
    Scroller,
    SettingsCard,
    SettingsCardsLayout,
    themeStore,
    Toggle
  } from '@hcengineering/ui'
  import settingRes from '../plugin'
  import ActiveInviteLinks from './ActiveInviteLinks.svelte'
  import UserRoleSelect from './UserRoleSelect.svelte'

  const client = getClient()
  const canManageInviteLinks = hasAccountRole(getCurrentAccount(), AccountRole.Maintainer)

  let loading = true
  let expTime: number = 48
  let mask: string = ''
  let limit: number | undefined = -1

  let defaultInviteRole: AccountRole = getDefaultInviteRole()
  let inviteLinkGeneratorRoles: AccountRole[] = getDefaultInviterRoles()
  let noLimit: boolean = true
  let existingInviteSettings: InviteSettings[] = []
  let existingRoleCapabilitySettings: {
    _id: Ref<RoleCapabilitySettings>
    roleByCapability?: Record<string, AccountRole[]>
  }[] = []
  const query = createQuery()
  const roleCapabilityQuery = createQuery()
  roleCapabilityQuery.query(setting.class.RoleCapabilitySettings, {}, (set) => {
    existingRoleCapabilitySettings = set as typeof existingRoleCapabilitySettings
  })
  $: inviteLimitInvalid = !noLimit && (limit === undefined || Number.isNaN(limit))
  $: roleByCapability = existingRoleCapabilitySettings[0]?.roleByCapability
  $: canManagePermissions = hasRoleCapability(
    getCurrentAccount(),
    RoleCapability.ManageInviteSettings,
    roleByCapability,
    undefined
  )
  let inviteLinkGeneratorRolesItems: DropdownTextItem[] = []
  $: lang = $themeStore?.language
  $: if (typeof lang === 'string') {
    void Promise.all([
      translate(settingRes.string.User, {}, lang),
      translate(settingRes.string.Maintainer, {}, lang),
      translate(settingRes.string.Owner, {}, lang)
    ]).then(([userLabel, maintainerLabel, ownerLabel]) => {
      inviteLinkGeneratorRolesItems = [
        { id: AccountRole.User, label: userLabel },
        { id: AccountRole.Maintainer, label: maintainerLabel },
        { id: AccountRole.Owner, label: ownerLabel }
      ]
    })
  }

  function applyInviteSettings (set: InviteSettings[]): void {
    existingInviteSettings = set
    const state = resolveInviteSettings(set[0])
    expTime = state.expirationTime
    mask = state.emailMask
    limit = state.limit
    defaultInviteRole = state.defaultInviteRole
    inviteLinkGeneratorRoles = state.inviteLinkGeneratorRoles
    noLimit = state.noLimit
    loading = false
  }

  $: query.query(setting.class.InviteSettings, {}, applyInviteSettings)

  function normalizeValues (): void {
    expTime = Math.max(1, expTime)
    limit = noLimit ? -1 : Math.max(1, limit ?? 1)
  }

  async function setInviteSettings (): Promise<void> {
    if (inviteLimitInvalid) return
    normalizeValues()
    const savedLimit = limit ?? -1

    const newSettings = {
      expirationTime: expTime,
      emailMask: mask,
      limit: savedLimit,
      defaultInviteRole,
      inviteLinkGeneratorRoles: [...inviteLinkGeneratorRoles],
      enabled: true
    }
    if (existingInviteSettings.length === 0) {
      await client.createDoc(setting.class.InviteSettings, core.space.Workspace, newSettings)
    } else {
      await client.updateDoc(
        setting.class.InviteSettings,
        core.space.Workspace,
        existingInviteSettings[0]._id,
        newSettings
      )
    }
    const newRoleByCapability: Record<string, AccountRole[]> = {
      ...(existingRoleCapabilitySettings[0]?.roleByCapability ?? {}),
      [RoleCapability.GenerateInviteLink]: [...inviteLinkGeneratorRoles]
    }
    const roleCapabilityPayload = { roleByCapability: newRoleByCapability, enabled: true }
    if (existingRoleCapabilitySettings.length === 0) {
      await client.createDoc(setting.class.RoleCapabilitySettings, core.space.Workspace, roleCapabilityPayload)
    } else {
      await client.updateDoc(
        setting.class.RoleCapabilitySettings,
        core.space.Workspace,
        existingRoleCapabilitySettings[0]._id,
        roleCapabilityPayload
      )
    }
  }

  async function autoSaveIfValid (): Promise<void> {
    if (loading || inviteLimitInvalid) return
    await setInviteSettings()
  }

  function handleNoLimitChange (e: CustomEvent<boolean>): void {
    noLimit = e.detail
    if (noLimit) {
      limit = -1
    } else if (limit === undefined || Number.isNaN(limit) || limit < 1) {
      limit = 1
    }
    void autoSaveIfValid()
  }

  function handleExpTimeChange (): void {
    void autoSaveIfValid()
  }

  function handleLimitChange (): void {
    void autoSaveIfValid()
  }

  function handleDefaultInviteRoleSelected (e: CustomEvent<AccountRole>): void {
    defaultInviteRole = e.detail
    void autoSaveIfValid()
  }

  function handleGeneratorRolesSelected (e: CustomEvent<AccountRole[] | undefined>): void {
    if (e.detail != null) {
      inviteLinkGeneratorRoles = [...e.detail]
    }
    void autoSaveIfValid()
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.InviteSettings} label={settingRes.string.InviteSettings} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    {#if loading}
      <div class="w-full h-full flex-col-center justify-center">
        <Loading />
      </div>
    {:else}
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content w-full">
          <SettingsCardsLayout columns={1}>
            <SettingsCard label={settingRes.string.InviteSettings}>
              <div class="flex-col flex-gap-4">
                <div class="flex-between flex-gap-4">
                  <Label label={login.string.LinkValidHours} />
                  <div class="flex-no-grow">
                    <EditBox
                      format={'number'}
                      kind={'default'}
                      minValue={1}
                      maxDigitsAfterPoint={0}
                      bind:value={expTime}
                      on:change={handleExpTimeChange}
                    />
                  </div>
                </div>

                <div class="flex-between flex-gap-4">
                  <Label label={login.string.NoLimit} />
                  <Toggle on={noLimit} on:change={handleNoLimitChange} />
                </div>

                {#if !noLimit}
                  <div class="flex-between flex-gap-4">
                    <Label label={login.string.InviteLimit} />
                    <EditBox
                      format={'number'}
                      minValue={1}
                      maxDigitsAfterPoint={0}
                      bind:value={limit}
                      on:change={handleLimitChange}
                    />
                  </div>
                {/if}

                <div class="flex-between flex-gap-4">
                  <Label label={settingRes.string.DefaultInviteRoleForJoin} />
                  <UserRoleSelect selected={defaultInviteRole} on:selected={handleDefaultInviteRoleSelected} />
                </div>
              </div>
            </SettingsCard>

            {#if canManagePermissions}
              <SettingsCard label={settingRes.string.Permissions}>
                <div class="flex-between flex-gap-4">
                  <Label label={settingRes.string.InviteLinkGeneratorRoles} />
                  <DropdownLabels
                    label={settingRes.string.InviteLinkGeneratorRoles}
                    items={inviteLinkGeneratorRolesItems}
                    selected={inviteLinkGeneratorRoles}
                    multiselect
                    autoSelect={false}
                    kind={'regular'}
                    size={'medium'}
                    on:selected={handleGeneratorRolesSelected}
                  />
                </div>
              </SettingsCard>
            {/if}

            {#if canManageInviteLinks}
              <SettingsCard label={login.string.ActiveInviteLinks}>
                <ActiveInviteLinks />
              </SettingsCard>
            {/if}
          </SettingsCardsLayout>
        </div>
      </Scroller>
    {/if}
  </div>
</div>
