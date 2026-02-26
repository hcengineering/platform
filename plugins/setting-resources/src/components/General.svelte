<!--
// Copyright © 2022-2024 Hardcore Engineering Inc.
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
  import card, { Card } from '@hcengineering/card'
  import chat from '@hcengineering/chat'
  import communication, { GuestCommunicationSettings } from '@hcengineering/communication'
  import contact, { AvatarType, ensureEmployeeForPerson } from '@hcengineering/contact'
  import { EditableAvatar, getAccountClient } from '@hcengineering/contact-resources'
  import core, {
    type Account,
    AccountRole,
    AccountUuid,
    Configuration,
    getCurrentAccount,
    pickPrimarySocialId,
    readOnlyGuestAccountUuid,
    Ref,
    WorkspaceAccountPermission
  } from '@hcengineering/core'
  import { loginId } from '@hcengineering/login'
  import { translateCB } from '@hcengineering/platform'
  import { createQuery, getClient, MessageBox, uiContext } from '@hcengineering/presentation'
  import { WorkspaceSetting } from '@hcengineering/setting'
  import {
    Breadcrumb,
    Button,
    Component,
    deviceOptionsStore as deviceInfo,
    DropdownLabels,
    type DropdownTextItem,
    EditBox,
    getLocalWeekStart,
    getWeekDayNames,
    hasLocalWeekStart,
    Header,
    IconCheckmark,
    IconClose,
    IconEdit,
    Label,
    Loading,
    navigate,
    Scroller,
    showPopup,
    themeStore,
    Toggle
  } from '@hcengineering/ui'
  import settingsRes from '../plugin'
  import ApiTokenPopup from './ApiTokenPopup.svelte'
  import WorkspacePermissionEditor from './WorkspacePermissionEditor.svelte'

  let loading = true
  let isEditingName = false
  let oldName: string
  let name: string = ''
  let workspaceUrl = ''
  let allowReadOnlyGuests: boolean
  let allowGuestSignUp: boolean
  let passwordAgingRule: number | undefined = undefined

  const accountClient = getAccountClient()
  const disabledSet = ['\n', '<', '>', '/', '\\']

  $: editNameDisabled =
    isEditingName &&
    (name.trim().length > 40 ||
      name.trim() === oldName ||
      name.trim() === '' ||
      disabledSet.some((it) => name.includes(it)))

  void loadWorkspaceName()

  async function loadWorkspaceName (): Promise<void> {
    const res = await accountClient.getWorkspaceInfo()

    workspaceUrl = res.url
    oldName = res.name
    name = oldName
    allowReadOnlyGuests = res.allowReadOnlyGuest ?? false
    allowGuestSignUp = res.allowGuestSignUp ?? false
    passwordAgingRule = res.passwordAgingRule ?? undefined
    loading = false
  }

  async function handleEditName (): Promise<void> {
    if (editNameDisabled) {
      return
    }

    if (isEditingName) {
      await accountClient.updateWorkspaceName(name.trim())
    }

    isEditingName = !isEditingName
  }

  function handleCancelEditName (): void {
    name = oldName
    isEditingName = false
  }

  async function handleDelete (): Promise<void> {
    showPopup(MessageBox, {
      label: settingsRes.string.DeleteWorkspace,
      message: settingsRes.string.DeleteWorkspaceConfirm,
      dangerous: true,
      action: async () => {
        await accountClient.deleteWorkspace()
        navigate({ path: [loginId] })
      }
    })
  }

  // Avatar
  let avatarEditor: EditableAvatar
  let workspaceSettings: WorkspaceSetting | undefined = undefined

  const client = getClient()
  void client.findOne(settingsRes.class.WorkspaceSetting, {}).then((r) => {
    workspaceSettings = r
  })

  async function handleAvatarDone (): Promise<void> {
    const existing = await client.findOne(settingsRes.class.WorkspaceSetting, { _id: settingsRes.ids.WorkspaceSetting })
    if (existing !== undefined) {
      const avatar = await avatarEditor.createAvatar()
      // Remove old avatar if changed
      if (existing.icon != null && existing.icon !== avatar.avatar) {
        await avatarEditor.removeAvatar(existing.icon)
      }

      const icon = avatar.avatarType === AvatarType.IMAGE ? avatar.avatar : null
      await client.diffUpdate(existing, { icon })
    } else {
      const avatar = await avatarEditor.createAvatar()

      await client.createDoc(
        settingsRes.class.WorkspaceSetting,
        core.space.Workspace,
        { icon: avatar.avatar },
        settingsRes.ids.WorkspaceSetting
      )
    }
  }

  const permissionConfigurationQuery = createQuery()
  let disablePermissionsConfiguration: Configuration | undefined = undefined
  $: arePermissionsDisabled = disablePermissionsConfiguration?.enabled ?? false

  $: permissionConfigurationQuery.query(
    core.class.Configuration,
    { _id: settingsRes.ids.DisablePermissionsConfiguration },
    (result) => {
      disablePermissionsConfiguration = result[0]
    }
  )

  async function handleToggleReadonlyAccess (e: CustomEvent<boolean>): Promise<void> {
    const enabled = e.detail
    const guestUserInfo = await accountClient.updateAllowReadOnlyGuests(enabled)
    allowReadOnlyGuests = enabled
    if (guestUserInfo !== undefined) {
      const guestAccount: Account = {
        uuid: guestUserInfo.guestPerson.uuid as AccountUuid,
        role: AccountRole.ReadOnlyGuest,
        primarySocialId: pickPrimarySocialId(guestUserInfo.guestSocialIds)._id,
        socialIds: guestUserInfo.guestSocialIds.map((si) => si._id),
        fullSocialIds: guestUserInfo.guestSocialIds
      }
      const myAccount = getCurrentAccount()
      const ctx = uiContext.newChild('connect', {})
      await ensureEmployeeForPerson(
        ctx,
        myAccount,
        guestAccount,
        client,
        guestUserInfo.guestSocialIds,
        guestUserInfo.guestPerson
      )
    } else {
      const readonlyEmployee = await client.findOne(contact.mixin.Employee, { personUuid: readOnlyGuestAccountUuid })
      if (readonlyEmployee !== undefined) {
        await client.update(readonlyEmployee, { active: false })
      }
    }
  }

  async function handleToggleGuestSignUp (e: CustomEvent<boolean>): Promise<void> {
    await accountClient.updateAllowGuestSignUp(e.detail)
  }

  async function changePasswordAgingRules (val: number | undefined): Promise<void> {
    passwordAgingRule = Math.max(val ?? 1, 1)
    await accountClient.updatePasswordAgingRule(passwordAgingRule)
  }

  async function handleGenerateApiToken (): Promise<void> {
    const { token } = await accountClient.selectWorkspace(workspaceUrl)
    showPopup(ApiTokenPopup, { token })
  }

  function handleTogglePermissions (): void {
    const newState = !arePermissionsDisabled
    showPopup(MessageBox, {
      label: newState ? settingsRes.string.DisablePermissions : settingsRes.string.EnablePermissions,
      message: newState
        ? settingsRes.string.DisablePermissionsConfirmation
        : settingsRes.string.EnablePermissionsConfirmation,
      dangerous: true,
      action: async () => {
        if (disablePermissionsConfiguration === undefined) {
          await client.createDoc(
            core.class.Configuration,
            core.space.Workspace,
            { enabled: newState },
            settingsRes.ids.DisablePermissionsConfiguration
          )
        } else {
          await client.update(disablePermissionsConfiguration, { enabled: newState })
        }
      }
    })
  }

  const weekInfoFirstDay: number = getLocalWeekStart()
  const hasWeekInfo: boolean = hasLocalWeekStart()
  const weekNames = getWeekDayNames()
  let items: DropdownTextItem[] = []
  let selected: string

  $: translateCB(
    hasWeekInfo ? settingsRes.string.SystemSetupString : settingsRes.string.DefaultString,
    { day: weekNames?.get(weekInfoFirstDay)?.toLowerCase() ?? '' },
    $themeStore.language,
    (r) => {
      items = [
        { id: 'system', label: r },
        ...Array.from(weekNames.entries()).map((it) => ({ id: it[0].toString(), label: it[1] }))
      ]
      const savedFirstDayOfWeek = localStorage.getItem('firstDayOfWeek') ?? 'system'
      selected = items[savedFirstDayOfWeek === 'system' ? 0 : $deviceInfo.firstDayOfWeek + 1].id
    }
  )

  let existingGuestChatSettings: GuestCommunicationSettings | undefined = undefined
  const query = createQuery()

  $: query.query(communication.class.GuestCommunicationSettings, {}, (settings) => {
    existingGuestChatSettings = settings[0]
  })

  async function onAllowedCardsChange (value: Ref<Card>[]): Promise<void> {
    if (existingGuestChatSettings === undefined) {
      await client.createDoc(communication.class.GuestCommunicationSettings, core.space.Workspace, {
        allowedCards: value,
        enabled: true
      })
    } else {
      await client.updateDoc(
        communication.class.GuestCommunicationSettings,
        core.space.Workspace,
        existingGuestChatSettings._id,
        { allowedCards: value, enabled: true }
      )
    }
  }

  const onSelected = (e: CustomEvent<string>): void => {
    selected = e.detail
    localStorage.setItem('firstDayOfWeek', `${e.detail}`)
    $deviceInfo.firstDayOfWeek = e.detail === 'system' ? weekInfoFirstDay : (parseInt(e.detail, 10) ?? 1)
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={settingsRes.icon.Setting} label={settingsRes.string.WorkspaceSettings} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    {#if loading}
      <div class="w-full h-full flex-col-center justify-center">
        <Loading />
      </div>
    {:else}
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content flex-col flex-gap-4">
          <div class="title"><Label label={settingsRes.string.Workspace} /></div>
          <div class="ws">
            <EditableAvatar
              person={{
                avatarType: workspaceSettings?.icon !== undefined ? AvatarType.IMAGE : AvatarType.COLOR,
                avatar: workspaceSettings?.icon
              }}
              size="medium"
              {name}
              bind:this={avatarEditor}
              on:done={handleAvatarDone}
              imageOnly
              lessCrop
            />
            <div class="editBox">
              <EditBox
                bind:value={name}
                placeholder={settingsRes.string.WorkspaceName}
                kind="ghost-large"
                disabled={!isEditingName}
              />
            </div>
            <Button
              icon={isEditingName ? IconCheckmark : IconEdit}
              kind="ghost"
              size="small"
              disabled={editNameDisabled}
              on:click={handleEditName}
            />
            {#if isEditingName}
              <Button icon={IconClose} kind="ghost" size="small" on:click={handleCancelEditName} />
            {/if}
          </div>

          <div class="flex-col flex-gap-4 mt-6">
            <div class="title"><Label label={settingsRes.string.PasswordAgingRule} /></div>
            <div class="flex-row-center flex-gap-4">
              <Label label={settingsRes.string.PasswordAgingRuleDescription} />
              <Toggle
                on={!!passwordAgingRule}
                on:change={(e) => {
                  if (e.detail === false) {
                    void changePasswordAgingRules(undefined)
                  } else {
                    void changePasswordAgingRules(30)
                  }
                }}
              />
              {#if passwordAgingRule}
                <div class="w-32">
                  <EditBox
                    format={'number'}
                    minValue={1}
                    maxDigitsAfterPoint={0}
                    bind:value={passwordAgingRule}
                    disabled={!passwordAgingRule}
                    on:change={() => changePasswordAgingRules(passwordAgingRule)}
                  />
                </div>
              {/if}
            </div>
          </div>

          <div class="flex-col flex-gap-4 mt-6">
            <div class="title"><Label label={settingsRes.string.Calendar} /></div>
            <div class="flex-row-center flex-gap-4">
              <Label label={settingsRes.string.StartOfTheWeek} />
              <DropdownLabels
                {items}
                kind={'regular'}
                size={'medium'}
                {selected}
                enableSearch={false}
                on:selected={onSelected}
              />
            </div>
          </div>

          <div class="flex-col flex-gap-4 mt-6">
            <div class="title"><Label label={settingsRes.string.GuestAccess} /></div>
            <div class="flex-row-center flex-gap-4">
              <Label label={settingsRes.string.GuestAccessDescription} />
              <Toggle
                on={allowReadOnlyGuests}
                on:change={(e) => {
                  void handleToggleReadonlyAccess(e)
                }}
              />
            </div>

            <div class="flex-row-center flex-gap-4">
              <Label label={settingsRes.string.GuestSignUpDescription} />
              <Toggle
                disabled={!allowReadOnlyGuests}
                on={allowGuestSignUp}
                on:change={(e) => {
                  void handleToggleGuestSignUp(e)
                }}
              />
            </div>

            <div class="flex-row-center flex-gap-4">
              <Label label={settingsRes.string.GuestChannelsDescription} />
              <Component
                is={card.component.CardArrayEditor}
                props={{
                  _class: chat.masterTag.Thread,
                  value: existingGuestChatSettings !== undefined ? existingGuestChatSettings.allowedCards : [],
                  label: settingsRes.string.GuestChannelsArrayLabel,
                  onChange: onAllowedCardsChange
                }}
              />
            </div>
          </div>

          <div class="flex-col flex-gap-4 mt-6">
            <div class="title"><Label label={settingsRes.string.AccessControl} /></div>
            <div class="w-32">
              <Button
                kind="regular"
                label={arePermissionsDisabled
                  ? settingsRes.string.EnablePermissions
                  : settingsRes.string.DisablePermissions}
                on:click={handleTogglePermissions}
              />
            </div>
          </div>

          <WorkspacePermissionEditor
            permission={WorkspaceAccountPermission.ImportDocument}
            label={settingsRes.string.ImportDocumentPermission}
            description={settingsRes.string.ImportDocumentDescription}
            allowGuests={true}
          />

          <div class="flex-col flex-gap-4 mt-6">
            <div class="title"><Label label={settingsRes.string.ApiAccess} /></div>
            <div class="w-32">
              <Button
                label={settingsRes.string.GenerateApiToken}
                kind="regular"
                disabled={workspaceUrl === ''}
                showTooltip={{ label: settingsRes.string.GenerateApiToken }}
                on:click={handleGenerateApiToken}
              />
            </div>
          </div>

          <div class="flex-col flex-gap-4 mt-6">
            <div class="title"><Label label={settingsRes.string.DangerZone} /></div>
            <div class="w-32">
              <Button
                label={settingsRes.string.DeleteWorkspace}
                kind="dangerous"
                on:click={handleDelete}
                showTooltip={{ label: settingsRes.string.DeleteWorkspace }}
              />
            </div>
          </div>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1rem;
  }
  .ws {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .editBox {
    width: 16rem;
  }
</style>
