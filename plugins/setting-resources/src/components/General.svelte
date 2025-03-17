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
  import core, { Configuration } from '@hcengineering/core'
  import {
    Breadcrumb,
    Header,
    Scroller,
    EditBox,
    Spinner,
    Button,
    IconEdit,
    IconClose,
    IconCheckmark,
    IconDelete,
    Label,
    navigate,
    showPopup,
    DropdownLabels,
    deviceOptionsStore as deviceInfo,
    themeStore,
    getWeekDayNames,
    getLocalWeekStart,
    hasLocalWeekStart,
    type DropdownTextItem
  } from '@hcengineering/ui'
  import { loginId } from '@hcengineering/login'
  import { EditableAvatar, getAccountClient } from '@hcengineering/contact-resources'
  import { translateCB } from '@hcengineering/platform'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import { WorkspaceSetting } from '@hcengineering/setting'
  import { AvatarType } from '@hcengineering/contact'
  import settingsRes from '../plugin'

  let loading = true
  let isEditingName = false
  let oldName: string
  let name: string = ''

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

    oldName = res.name
    name = oldName
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
    if (workspaceSettings === undefined) {
      const avatar = await avatarEditor.createAvatar()
      await client.createDoc(
        settingsRes.class.WorkspaceSetting,
        core.space.Workspace,
        { icon: avatar.avatar },
        settingsRes.ids.WorkspaceSetting
      )
      return
    }

    const avatar = await avatarEditor.createAvatar()
    if (workspaceSettings.icon != null && workspaceSettings.icon !== avatar.avatar) {
      // Different avatar
      await avatarEditor.removeAvatar(workspaceSettings.icon)
    }
    await client.update(workspaceSettings, {
      icon: avatar.avatar
    })
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

  function handleTogglePermissions (): void {
    const newState = !arePermissionsDisabled
    showPopup(MessageBox, {
      label: newState ? settingsRes.string.DisablePermissions : settingsRes.string.EnablePermissions,
      message: newState ? settingsRes.string.DisablePermissionsConfirmation : settingsRes.string.EnablePermissionsConfirmation,
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
  const onSelected = (e: CustomEvent<string>): void => {
    selected = e.detail
    localStorage.setItem('firstDayOfWeek', `${e.detail}`)
    $deviceInfo.firstDayOfWeek = e.detail === 'system' ? weekInfoFirstDay : parseInt(e.detail, 10) ?? 1
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={settingsRes.icon.Setting} label={settingsRes.string.General} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    {#if loading}
      <Spinner size={'small'} />
    {:else}
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content flex-col flex-gap-4">
          <div class="title"><Label label={settingsRes.string.Workspace} /></div>
          <div class="ws">
            <EditableAvatar
              person={{
                avatarType: AvatarType.IMAGE,
                avatar: workspaceSettings?.icon
              }}
              size="medium"
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
            <Button
              icon={IconDelete}
              kind="dangerous"
              on:click={handleDelete}
              showTooltip={{ label: settingsRes.string.DeleteWorkspace }}
            />
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
          <div class="title mt-6"><Label label={settingsRes.string.Permissions} /></div>
          <div class="delete">
            <Button
              kind="regular"
              label={arePermissionsDisabled
                ? settingsRes.string.EnablePermissions
                : settingsRes.string.DisablePermissions}
              on:click={handleTogglePermissions}
            />
          </div>
          <div class="title mt-6"><Label label={settingsRes.string.Permissions} /></div>
          <div class="delete">
            <Button
              kind="regular"
              label={arePermissionsDisabled
                ? settingsRes.string.EnablePermissions
                : settingsRes.string.DisablePermissions}
              on:click={handleTogglePermissions}
            />
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

  .delete {
    width: 6rem;
  }
</style>
