<script lang="ts">
  import { Integration, IntegrationKey } from '@hcengineering/account-client'
  import presentation, { getClient, getCurrentWorkspaceUrl, getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import {
    Dropdown,
    Label,
    ListItem,
    Modal,
    ModernEditbox,
    CheckBox,
    Spinner,
    Button,
    IconCopy,
    EditBox
  } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import calendar from '@hcengineering/calendar'
  import { createEventDispatcher, onMount } from 'svelte'
  import { getMetadata, IntlString, translateCB } from '@hcengineering/platform'
  import contact, { getCurrentEmployee, SocialIdentityRef } from '@hcengineering/contact'
  import { buildSocialIdString, getCurrentAccount, PersonId, SocialIdType } from '@hcengineering/core'
  import { calendarByIdStore, getAccountClient } from '../utils'

  const workspaceUuid = getCurrentWorkspaceUuid()

  let integrationGlobal: Integration | null = null
  let integrationWs: Integration | null = null

  let loading = true
  let error: string | undefined
  const availableAccounts: ListItem[] = []
  let selectedAccount: ListItem | undefined
  let accessEnabled = false
  let serverUrl = getMetadata(calendar.metadata.CalDavServerURL)
  let password = ''
  let totalWsIntegrations = 0

  const dispatch = createEventDispatcher()

  $: wasAccessEnabled = integrationGlobal !== null && integrationWs !== null
  $: canSave = !!(
    !loading &&
    ((!wasAccessEnabled && accessEnabled && selectedAccount != null) ||
      (wasAccessEnabled && !accessEnabled) ||
      (wasAccessEnabled && accessEnabled && selectedAccount != null && selectedAccount._id !== integrationWs?.socialId))
  )

  function generateRandomPassword (length = 24): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    const numbers: number[] = []
    for (let i = 0; i < array.length; i++) {
      numbers.push(array[i])
    }
    return btoa(String.fromCharCode.apply(null, numbers)).replace(/[+/=]/g, '').slice(0, length)
  }

  onMount(async () => {
    loading = true
    try {
      password = generateRandomPassword()

      const account = getCurrentAccount()
      const accountClient = getAccountClient()
      const wsId = getCurrentWorkspaceUuid()
      for (const socialId of account.fullSocialIds) {
        // TODO: Handle delete social ids generically, we don't have isDelete field on thr workspace side
        if (socialId.type === SocialIdType.EMAIL && socialId.value.includes('#')) {
          continue
        }
        if (availableAccounts.find((a) => a.label === socialId.value) == null) {
          availableAccounts.push({
            _id: socialId._id,
            label: socialId.value
          })
        }
        const integrations = await accountClient.listIntegrations({
          socialId: socialId._id,
          kind: 'caldav'
        })
        for (const integration of integrations) {
          if (integration.workspaceUuid == null) {
            if (integrationGlobal == null) {
              integrationGlobal = integration
              continue
            }
          }
          totalWsIntegrations += 1
          if (integration.workspaceUuid === wsId && integrationWs == null) {
            integrationWs = integration
            selectedAccount = {
              _id: socialId._id,
              label: socialId.value
            }
          }
        }
      }
      accessEnabled = integrationWs != null && integrationGlobal != null
    } catch (err: any) {
      console.error('Failed to load CalDAV intergrations', err)
      error = `${err.message ?? 'Unable to load CalDAV intergrations'}`
    }
    loading = false
  })

  async function save (): Promise<void> {
    loading = true
    try {
      const accountClient = getAccountClient()
      if (wasAccessEnabled && !accessEnabled) {
        // Access disabled
        await accountClient.deleteIntegration({
          socialId: selectedAccount?._id as PersonId,
          kind: 'caldav',
          workspaceUuid
        })
        if (totalWsIntegrations === 1 && integrationGlobal != null) {
          await accountClient.deleteIntegrationSecret({
            socialId: integrationGlobal.socialId,
            kind: 'caldav',
            workspaceUuid: null,
            key: 'caldav'
          })
          await accountClient.deleteIntegration({
            socialId: integrationGlobal.socialId,
            kind: 'caldav',
            workspaceUuid: null
          })
        }
      } else if (!wasAccessEnabled && accessEnabled) {
        // Access enabled
        if (integrationGlobal === null) {
          await accountClient.createIntegration({
            socialId: selectedAccount?._id as PersonId,
            kind: 'caldav',
            workspaceUuid: null
          })
          integrationGlobal = await accountClient.getIntegration({
            socialId: selectedAccount?._id as PersonId,
            kind: 'caldav',
            workspaceUuid: null
          })
        }
        const secret = await accountClient.getIntegrationSecret({
          socialId: integrationGlobal?.socialId as PersonId,
          kind: 'caldav',
          workspaceUuid: null,
          key: 'caldav'
        })
        if (secret == null) {
          await accountClient.addIntegrationSecret({
            socialId: integrationGlobal?.socialId as PersonId,
            kind: 'caldav',
            workspaceUuid: null,
            key: 'caldav',
            secret: password
          })
        }
        await accountClient.createIntegration({
          socialId: selectedAccount?._id as PersonId,
          kind: 'caldav',
          workspaceUuid
        })
      } else if (accessEnabled && wasAccessEnabled && selectedAccount?._id !== integrationWs?.socialId) {
        // Access changed
        await accountClient.deleteIntegration({
          socialId: integrationWs?.socialId as PersonId,
          kind: 'caldav',
          workspaceUuid
        })
        await accountClient.createIntegration({
          socialId: selectedAccount?._id as PersonId,
          kind: 'caldav',
          workspaceUuid
        })
      }
      dispatch('close', true)
    } catch (err: any) {
      error = `${err.message ?? 'Unable to save CalDAV intergration'}`
      console.error('Failed to save CalDAV integration', err)
    }
    loading = false
  }

  async function copyServer (): Promise<void> {
    console.log(serverUrl)
    await navigator?.clipboard?.writeText(serverUrl ?? '')
  }

  async function copyAccount (): Promise<void> {
    console.log(selectedAccount?.label)
    await navigator?.clipboard?.writeText(selectedAccount?.label ?? '')
  }

  async function copyPassword (): Promise<void> {
    loading = true
    try {
      if (integrationGlobal != null) {
        const accountClient = getAccountClient()
        const secret = await accountClient.getIntegrationSecret({
          socialId: integrationGlobal.socialId,
          kind: 'caldav',
          workspaceUuid: null,
          key: 'caldav'
        })
        if (secret != null) {
          await navigator?.clipboard?.writeText(secret.secret)
          return
        }
      }
      await navigator?.clipboard?.writeText(password)
    } catch (err: any) {
      error = `${err.message ?? 'Unable to copy password'}`
      console.error('Failed to copy password', err)
    }
    loading = false
  }
</script>

<Modal
  label={calendar.string.CalDavAccess}
  type="type-popup"
  width="small"
  okLabel={presentation.string.Save}
  okAction={save}
  {canSave}
  showCancelButton={false}
  onCancel={() => {
    dispatch('close')
  }}
>
  <div class="flex-col-stretch" style="gap: 1.5rem">
    <div class="prompt">
      <Label label={calendar.string.CalDavAccessPrompt} />
    </div>

    <div class="flex-row-center">
      <CheckBox kind="primary" bind:checked={accessEnabled} />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="ml-2"
        style="cursor: pointer"
        on:click={() => {
          accessEnabled = !accessEnabled
        }}
      >
        <Label label={calendar.string.CalDavAccessEnable} params={{ ws: getCurrentWorkspaceUrl() }} />
      </div>
    </div>

    <div class="flex-col-stretch flex-gap-1-5" class:accessDisabled={!accessEnabled}>
      <Label label={calendar.string.CalDavAccessServer} />
      <div class="flex-row-center flex-gap-1">
        <EditBox bind:value={serverUrl} kind="ghost" fullSize focusable disabled={true} />
        <Button
          icon={IconCopy}
          size="small"
          kind="ghost"
          disabled={!accessEnabled}
          showTooltip={{ label: presentation.string.Copy }}
          on:click={copyServer}
        />
      </div>
    </div>

    <div class="flex-col-stretch flex-gap-1-5" class:accessDisabled={!accessEnabled}>
      <Label label={calendar.string.CalDavAccessAccount} />
      <div class="flex-row-center flex-gap-1">
        <Dropdown
          size="large"
          placeholder={calendar.string.CalDavAccessAccount}
          items={availableAccounts}
          selected={selectedAccount}
          justify="left"
          withSearch={false}
          stretchWidth={true}
          disabled={!accessEnabled}
          on:selected={(e) => {
            selectedAccount = e.detail
          }}
        />
        <Button
          icon={IconCopy}
          size="small"
          kind="ghost"
          showTooltip={{ label: presentation.string.Copy }}
          disabled={!accessEnabled}
          on:click={copyAccount}
        />
      </div>
    </div>

    <div class="flex-col-stretch flex-gap-1-5" class:accessDisabled={!accessEnabled}>
      <Label label={calendar.string.CalDavAccessPassword} />
      <div class="flex-row-center flex-gap-1">
        <EditBox bind:value={password} kind="ghost" format="password" fullSize focusable disabled={true} />
        <Button
          icon={IconCopy}
          size="small"
          kind="ghost"
          disabled={!accessEnabled}
          showTooltip={{ label: presentation.string.Copy }}
          on:click={copyPassword}
        />
      </div>
    </div>

    {#if error}
      <div style="color: var(--theme-error-color)">{error}</div>
    {/if}
  </div>
  <svelte:fragment slot="buttons">
    {#if loading}
      <Spinner size="medium" />
    {/if}
  </svelte:fragment>
</Modal>

<style lang="scss">
  .accessDisabled {
    opacity: 0.5;
  }

  .prompt {
    padding: 0.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    background-color: var(--theme-bg-color);
  }
</style>
