<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import core, { AccountRole, getCurrentAccount, hasAccountRole, type Ref } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { type InviteSettings, type RoleCapabilitySettings, RoleCapability } from '@hcengineering/setting'
  import { hasRoleCapability } from '../roleCapability'
  import { isValidInviteRestriction } from '../inviteDuration'
  import {
    getDefaultInviterRoles,
    getDefaultInviteRole,
    INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS,
    resolveInviteSettings
  } from '../inviteSettingsUtils'
  import { translate } from '@hcengineering/platform'
  import {
    Breadcrumb,
    DropdownLabels,
    DropdownTextItem,
    Header,
    Label,
    Loading,
    Notice,
    Scroller,
    SettingsCard,
    SettingsCardsLayout,
    themeStore
  } from '@hcengineering/ui'
  import settingRes from '../plugin'
  import ActiveInviteLinks from './ActiveInviteLinks.svelte'
  import InviteExpirationSelect from './InviteExpirationSelect.svelte'
  import InviteUsesSelect from './InviteUsesSelect.svelte'
  import UserRoleSelect from './UserRoleSelect.svelte'

  const client = getClient()
  const canManageInviteLinks = hasAccountRole(getCurrentAccount(), AccountRole.Maintainer)

  let loading = true
  let expTime: number = INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS
  let mask: string = ''
  let limit: number = -1
  let saveFailed = false

  let defaultInviteRole: AccountRole = getDefaultInviteRole()
  let inviteLinkGeneratorRoles: AccountRole[] = getDefaultInviterRoles()
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
    loading = false
  }

  $: query.query(setting.class.InviteSettings, {}, applyInviteSettings)

  function isValid (): boolean {
    return isValidInviteRestriction(expTime) && isValidInviteRestriction(limit)
  }

  async function setInviteSettings (): Promise<void> {
    const newSettings = {
      expirationTime: expTime,
      emailMask: mask,
      limit,
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
    if (loading) return
    // A new edit makes the previous save error stale, whether or not the new value can be saved
    saveFailed = false
    if (!isValid()) return
    try {
      await setInviteSettings()
    } catch (err: unknown) {
      saveFailed = true
      Analytics.handleError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  function handleExpTimeChange (e: CustomEvent<number>): void {
    expTime = e.detail
    void autoSaveIfValid()
  }

  function handleLimitChange (e: CustomEvent<number>): void {
    limit = e.detail
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
                <div class="field">
                  <Label label={login.string.LinkExpires} />
                  <div class="control">
                    <InviteExpirationSelect value={expTime} on:change={handleExpTimeChange} />
                  </div>
                </div>

                <div class="field">
                  <Label label={login.string.LimitUses} />
                  <div class="control">
                    <InviteUsesSelect value={limit} on:change={handleLimitChange} />
                  </div>
                </div>

                <div class="flex-between flex-gap-4">
                  <Label label={settingRes.string.DefaultInviteRoleForJoin} />
                  <UserRoleSelect selected={defaultInviteRole} on:selected={handleDefaultInviteRoleSelected} />
                </div>

                {#if saveFailed}
                  <Notice kind={'error'} label={settingRes.string.InviteSettingsSaveFailed} />
                {/if}
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

<style lang="scss">
  .field {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-4);
  }

  .control {
    width: 14rem;
    max-width: 50%;
    flex-shrink: 0;
  }
</style>
