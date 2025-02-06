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
  import core from '@hcengineering/core'
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
    type DropdownTextItem
  } from '@hcengineering/ui'
  import { loginId } from '@hcengineering/login'
  import { EditableAvatar } from '@hcengineering/contact-resources'
  import { translateCB } from '@hcengineering/platform'
  import { getClient, MessageBox } from '@hcengineering/presentation'
  import { WorkspaceSetting } from '@hcengineering/setting'
  import { AvatarType } from '@hcengineering/contact'

  import setting from '../plugin'
  import { getAccountClient } from '../utils'

  let loading = true
  let isEditingName = false
  let oldName: string
  let name: string = ''

  const accountClient = getAccountClient()

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

  $: editNameDisabled = isEditingName && (name.trim() === oldName || name.trim() === '')

  async function handleDelete (): Promise<void> {
    showPopup(MessageBox, {
      label: setting.string.DeleteWorkspace,
      message: setting.string.DeleteWorkspaceConfirm,
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
  client.findOne(setting.class.WorkspaceSetting, {}).then((r) => {
    workspaceSettings = r
  })

  async function handleAvatarDone (): Promise<void> {
    if (workspaceSettings === undefined) {
      const avatar = await avatarEditor.createAvatar()
      await client.createDoc(
        setting.class.WorkspaceSetting,
        core.space.Workspace,
        { icon: avatar.avatar },
        setting.ids.WorkspaceSetting
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

  const weekInfoFirstDay: number = getLocalWeekStart()
  const weekNames = getWeekDayNames()
  let items: DropdownTextItem[] = []
  let selected: string

  $: translateCB(
    setting.string.SystemSetupString,
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
    <Breadcrumb icon={setting.icon.Setting} label={setting.string.General} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    {#if loading}
      <Spinner size={'small'} />
    {:else}
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content flex-col flex-gap-4">
          <div class="title"><Label label={setting.string.Workspace} /></div>
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
                placeholder={setting.string.WorkspaceName}
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
              showTooltip={{ label: setting.string.DeleteWorkspace }}
            />
          </div>
          <div class="flex-col flex-gap-4 mt-6">
            <div class="title"><Label label={setting.string.Calendar} /></div>
            <div class="flex-row-center flex-gap-4">
              <Label label={setting.string.StartOfTheWeek} />
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
