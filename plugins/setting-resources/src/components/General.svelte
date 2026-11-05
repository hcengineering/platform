<!--
// Copyright © 2022-2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX
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
  import { AvatarType } from '@hcengineering/contact'
  import type { ApiKey } from '@hcengineering/account-client'
  import { EditableAvatar, getAccountClient } from '@hcengineering/contact-resources'
  import core, {
    type Blob as PlatformBlob,
    Configuration,
    DateRangeMode,
    type Ref,
    WorkspaceAccountPermission
  } from '@hcengineering/core'
  import { loginId } from '@hcengineering/login'
  import { setPlatformStatus, translateCB, unknownError } from '@hcengineering/platform'
  import {
    copyTextToClipboard,
    createQuery,
    getClient,
    getCurrentWorkspaceUuid,
    getFileUrl,
    MessageBox,
    withBlobVersion,
    workspaceLogoBlobId
  } from '@hcengineering/presentation'
  import { WorkspaceSetting } from '@hcengineering/setting'
  import view from '@hcengineering/view'
  import {
    Breadcrumb,
    Button,
    DatePresenter,
    deviceOptionsStore as deviceInfo,
    DropdownLabels,
    type DropdownTextItem,
    EditBox,
    getLocalWeekStart,
    getPlatformColorForText,
    getWeekDayNames,
    hasLocalWeekStart,
    Header,
    IconCheckmark,
    IconClose,
    IconCopy,
    IconDelete,
    IconEdit,
    Label,
    Loading,
    navigate,
    Scroller,
    SettingsCard,
    SettingsCardsLayout,
    SettingsFooterAction,
    showPopup,
    themeStore,
    Toggle
  } from '@hcengineering/ui'
  import settingsRes from '../plugin'
  import ApiKeyPopup from './ApiTokenPopup.svelte'
  import CreateApiKey from './CreateApiKey.svelte'
  import WorkspacePermissionEditor from './WorkspacePermissionEditor.svelte'

  let loading = true
  let isEditingName = false
  let oldName: string
  let name: string = ''
  let workspaceUrl = ''
  let workspaceId = ''
  let workspaceIdCopied = false
  let passwordAgingRule: number | undefined = undefined
  let apiKeys: ApiKey[] = []

  const accountClient = getAccountClient()
  const disabledSet = ['\n', '<', '>', '/', '\\']

  $: editNameDisabled =
    isEditingName &&
    (name.trim().length > 40 ||
      name.trim() === oldName ||
      name.trim() === '' ||
      disabledSet.some((it) => name.includes(it)))

  // Same seed as the workspace switcher, so the fallback color matches.
  $: workspaceAvatarColor = getPlatformColorForText(getCurrentWorkspaceUuid(), $themeStore.dark)

  void loadWorkspaceName()
  void loadApiKeys()

  async function loadWorkspaceName (): Promise<void> {
    const res = await accountClient.getWorkspaceInfo()

    workspaceUrl = res.url
    workspaceId = res.uuid
    oldName = res.name
    name = oldName
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
    if (workspaceUrl === '') return
    showPopup(MessageBox, {
      label: settingsRes.string.DeleteWorkspace,
      message: settingsRes.string.DeleteWorkspaceConfirm,
      okLabel: settingsRes.string.DeleteWorkspace,
      confirmationValue: workspaceUrl,
      confirmationLabel: settingsRes.string.EnterWorkspaceUrlToConfirmDeletion,
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

  // The logo blob key never changes, so version the URL by modifiedOn to bypass the cache.
  $: workspaceLogoUrl =
    workspaceSettings?.icon != null
      ? (withBlobVersion(getFileUrl(workspaceSettings.icon), workspaceSettings.modifiedOn) as Ref<PlatformBlob>)
      : undefined

  const client = getClient()
  const workspaceSettingsQuery = createQuery()
  workspaceSettingsQuery.query(settingsRes.class.WorkspaceSetting, { _id: settingsRes.ids.WorkspaceSetting }, (res) => {
    workspaceSettings = res[0]
  })

  async function handleAvatarDone (): Promise<void> {
    try {
      const existing = await client.findOne(settingsRes.class.WorkspaceSetting, {
        _id: settingsRes.ids.WorkspaceSetting
      })
      const avatar = await avatarEditor.createAvatar(workspaceLogoBlobId)
      const previousIcon = existing?.icon ?? null
      // Without a new file createAvatar returns the displayed URL, not a blob id.
      const icon: NonNullable<WorkspaceSetting['icon']> | null =
        avatar.avatarType !== AvatarType.IMAGE
          ? null
          : avatar.avatar != null && avatar.avatar.includes('://')
            ? previousIcon
            : (avatar.avatar ?? null)

      if (existing !== undefined) {
        // Not diffUpdate: icon stays `logo`, but modifiedOn must change to bust the cache.
        await client.update(existing, { icon })
      } else {
        await client.createDoc(
          settingsRes.class.WorkspaceSetting,
          core.space.Workspace,
          { icon },
          settingsRes.ids.WorkspaceSetting
        )
      }

      if (previousIcon != null && previousIcon !== icon) {
        await avatarEditor.removeAvatar(previousIcon)
      }
    } catch (err: unknown) {
      await setPlatformStatus(unknownError(err))
    }
  }

  const permissionConfigurationQuery = createQuery()
  let disablePermissionsConfiguration: Configuration | undefined = undefined
  $: arePermissionsDisabled = disablePermissionsConfiguration?.enabled ?? false
  let roleBasedAccessControlEnabled = false
  $: roleBasedAccessControlEnabled = !arePermissionsDisabled

  $: permissionConfigurationQuery.query(
    core.class.Configuration,
    { _id: settingsRes.ids.DisablePermissionsConfiguration },
    (result) => {
      disablePermissionsConfiguration = result[0]
    }
  )

  async function changePasswordAgingRules (val: number | undefined): Promise<void> {
    passwordAgingRule = val !== undefined ? Math.max(val, 1) : undefined
    await accountClient.updatePasswordAgingRule(passwordAgingRule)
  }

  async function loadApiKeys (): Promise<void> {
    apiKeys = await accountClient.getApiKeys()
  }

  async function copyWorkspaceId (): Promise<void> {
    await copyTextToClipboard(workspaceId)
    workspaceIdCopied = true
    setTimeout(() => {
      workspaceIdCopied = false
    }, 1000)
  }

  function handleCreateApiKey (): void {
    showPopup(CreateApiKey, {}, 'top', async (title?: string) => {
      if (title === undefined) return
      const { key } = await accountClient.createApiKey(title)
      showPopup(ApiKeyPopup, { apiKey: key })
      await loadApiKeys()
    })
  }

  function handleRevokeApiKey (apiKey: ApiKey): void {
    showPopup(MessageBox, {
      label: settingsRes.string.ApiToken,
      message: settingsRes.string.RevokeApiKeyConfirm,
      params: { name: apiKey.name },
      dangerous: true,
      action: async () => {
        await accountClient.revokeApiKey(apiKey.id)
        await loadApiKeys()
      }
    })
  }

  function handleTogglePermissions (event: CustomEvent<boolean>): void {
    const newState = !event.detail
    roleBasedAccessControlEnabled = event.detail

    showPopup(
      MessageBox,
      {
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
      },
      undefined,
      (confirmed) => {
        if (confirmed !== true) {
          roleBasedAccessControlEnabled = !arePermissionsDisabled
        }
      }
    )
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
        <div class="hulyComponent-content w-full">
          <SettingsCardsLayout columns={2}>
            <div class="flex-col flex-gap-4">
              <SettingsCard label={settingsRes.string.Workspace}>
                <div class="flex-row-bottom flex-gap-4">
                  <EditableAvatar
                    person={{
                      avatarType: workspaceSettings?.icon != null ? AvatarType.IMAGE : AvatarType.COLOR,
                      avatar: workspaceLogoUrl,
                      avatarProps: { color: workspaceAvatarColor, colorPalette: 'platform' }
                    }}
                    size="medium"
                    {name}
                    bind:this={avatarEditor}
                    on:done={handleAvatarDone}
                    imageOnly
                    lessCrop
                  />
                  <div class="flex-col flex-gap-2 flex-grow">
                    <div class="field-label"><Label label={settingsRes.string.WorkspaceName} /></div>
                    <div class="flex-row-center flex-gap-2">
                      <EditBox
                        bind:value={name}
                        placeholder={settingsRes.string.WorkspaceName}
                        kind="default"
                        disabled={!isEditingName}
                      />
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
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard label={settingsRes.string.ApiAccess}>
                <div class="flex-col flex-gap-4">
                  {#if workspaceId !== ''}
                    <div class="flex-row-col">
                      <div class="field-label"><Label label={settingsRes.string.WorkspaceId} /></div>
                      <div class="flex-row-center">
                        <div class="flex-col flex-gap-4 flex-grow min-w-0">
                          <span class="overflow-label">{workspaceId}</span>
                        </div>
                        <Button
                          icon={IconCopy}
                          showTooltip={{ label: workspaceIdCopied ? view.string.Copied : view.string.CopyToClipboard }}
                          kind="ghost"
                          size="small"
                          on:click={copyWorkspaceId}
                        />
                      </div>
                    </div>
                  {/if}

                  {#if apiKeys.length > 0}
                    <div class="separator" />
                    <div class="flex-col flex-gap-2">
                      {#each apiKeys as apiKey (apiKey.id)}
                        <div class="flex-row-center flex-gap-2">
                          <DatePresenter
                            value={apiKey.createdOn}
                            kind={'ghost'}
                            mode={DateRangeMode.DATETIME}
                            showIcon={false}
                          />
                          <div class="flex-between flex-gap-2 flex-grow">
                            <span class="overflow-label">{apiKey.name}</span>
                            <span class="overflow-label flex-no-shrink"
                              >{apiKey.keySuffix !== undefined ? `...${apiKey.keySuffix}` : ''}</span
                            >
                          </div>
                          <Button
                            icon={IconDelete}
                            kind="ghost"
                            size="small"
                            on:click={() => {
                              handleRevokeApiKey(apiKey)
                            }}
                          />
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>

                <SettingsFooterAction
                  slot="footer"
                  label={settingsRes.string.GenerateApiToken}
                  disabled={workspaceUrl === ''}
                  on:click={handleCreateApiKey}
                />
              </SettingsCard>

              <SettingsCard label={settingsRes.string.DeleteWorkspace}>
                <Label label={settingsRes.string.DeleteWorkspaceDescription} />
                <SettingsFooterAction
                  slot="footer"
                  label={settingsRes.string.DeleteWorkspace}
                  color="dangerous"
                  disabled={workspaceUrl === ''}
                  on:click={handleDelete}
                />
              </SettingsCard>
            </div>

            <div class="flex-col flex-gap-4">
              <SettingsCard label={settingsRes.string.AccessControl}>
                <div class="flex-col flex-gap-4">
                  <div class="flex-between flex-gap-4">
                    <div class="flex-grow min-w-0">
                      <Label label={settingsRes.string.EnablePermissions} />
                    </div>
                    <Toggle on={roleBasedAccessControlEnabled} on:change={handleTogglePermissions} />
                  </div>
                  <WorkspacePermissionEditor
                    permission={WorkspaceAccountPermission.ImportDocument}
                    label={settingsRes.string.ImportDocumentPermission}
                    description={settingsRes.string.ImportDocumentDescription}
                    allowGuests={true}
                    showTitle={false}
                  />
                </div>
              </SettingsCard>

              <SettingsCard label={settingsRes.string.PasswordAgingRule}>
                <Toggle
                  slot="actions"
                  on={!!passwordAgingRule}
                  on:change={(e) => {
                    if (e.detail === false) {
                      void changePasswordAgingRules(undefined)
                    } else {
                      void changePasswordAgingRules(30)
                    }
                  }}
                />
                <div class="flex-col flex-gap-2">
                  <Label
                    label={passwordAgingRule
                      ? settingsRes.string.PasswordAgingRuleDescription
                      : settingsRes.string.PasswordAgingDisabled}
                  />
                  {#if passwordAgingRule}
                    <div class="flex-between flex-gap-4">
                      <div class="flex-grow min-w-0">
                        <Label label={settingsRes.string.PasswordAgingPeriod} />
                      </div>
                      <div class="w-32">
                        <EditBox
                          format={'number'}
                          kind={'default'}
                          minValue={1}
                          maxDigitsAfterPoint={0}
                          bind:value={passwordAgingRule}
                          disabled={!passwordAgingRule}
                          on:change={() => changePasswordAgingRules(passwordAgingRule)}
                        />
                      </div>
                    </div>
                  {/if}
                </div>
              </SettingsCard>

              <SettingsCard label={settingsRes.string.Calendar}>
                <div class="flex-between flex-gap-4">
                  <div class="flex-grow min-w-0"><Label label={settingsRes.string.StartOfTheWeek} /></div>
                  <DropdownLabels
                    {items}
                    kind={'regular'}
                    size={'medium'}
                    {selected}
                    enableSearch={false}
                    on:selected={onSelected}
                  />
                </div>
              </SettingsCard>
            </div>
          </SettingsCardsLayout>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .field-label {
    color: var(--theme-caption-color);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1rem;
  }

  .separator {
    height: 1px;
    background-color: var(--divider-color);
  }
</style>
