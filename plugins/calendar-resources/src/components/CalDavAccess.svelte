<script lang="ts">
  import { Integration } from '@hcengineering/account-client'
  import presentation, {
    copyTextToClipboard,
    getCurrentWorkspaceUrl,
    getCurrentWorkspaceUuid
  } from '@hcengineering/presentation'
  import { Label, Modal, CheckBox, Spinner, Button, IconCopy, EditBox } from '@hcengineering/ui'
  import calendar, { caldavIntegrationKind } from '@hcengineering/calendar'
  import { createEventDispatcher, onMount } from 'svelte'
  import { slide } from 'svelte/transition'
  import { quintOut } from 'svelte/easing'
  import { getMetadata } from '@hcengineering/platform'
  import { getCurrentAccount, pickPrimarySocialId, SocialId, SocialIdType } from '@hcengineering/core'
  import { getAccountClient } from '../utils'

  const workspaceUuid = getCurrentWorkspaceUuid()

  let integrationGlobal: Integration | null = null
  let integrationWs: Integration | null = null

  let loading = true
  let error: string | undefined
  let selectedSocialId: SocialId | undefined
  let hulySocialId = ''
  let accessEnabled = false
  let serverUrl = getMetadata(calendar.metadata.CalDavServerURL)
  let password = ''
  let totalWsIntegrations = 0

  const dispatch = createEventDispatcher()

  let isServerUrlCopied = false
  let serverUrlCopyTimeout: ReturnType<typeof setTimeout> | undefined

  let isAccountCopied = false
  let accountCopyTimeout: ReturnType<typeof setTimeout> | undefined

  let isPasswordCopied = false
  let passwordCopyTimeout: ReturnType<typeof setTimeout> | undefined

  $: wasAccessEnabled = integrationGlobal !== null && integrationWs !== null
  $: canSave = !!(
    !loading &&
    ((!wasAccessEnabled && accessEnabled && selectedSocialId != null) || (wasAccessEnabled && !accessEnabled))
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

      const socialId = pickPrimarySocialId(getCurrentAccount().fullSocialIds)
      if (socialId.type !== SocialIdType.HULY) {
        // Thid should not happen, no need to translate
        error = 'Appropriate account not found'
        return
      }

      const wsId = getCurrentWorkspaceUuid()
      hulySocialId = socialId.value
      const accountClient = getAccountClient()
      const integrations = await accountClient.listIntegrations({
        socialId: socialId._id,
        kind: caldavIntegrationKind
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
        }
      }
      selectedSocialId = socialId
      accessEnabled = integrationWs != null && integrationGlobal != null
    } catch (err: any) {
      console.error('Failed to load CalDAV intergrations', err)
      error = `${err.message ?? 'Unable to load CalDAV intergrations'}`
    } finally {
      loading = false
    }
  })

  async function save (): Promise<void> {
    loading = true
    try {
      if (selectedSocialId == null) {
        return
      }
      const accountClient = getAccountClient()
      const socialId = selectedSocialId._id
      const kind = caldavIntegrationKind
      const key = 'password'
      if (wasAccessEnabled && !accessEnabled) {
        // Access disabled
        await accountClient.deleteIntegration({
          socialId,
          kind,
          workspaceUuid
        })
        if (totalWsIntegrations === 1 && integrationGlobal != null) {
          await accountClient.deleteIntegrationSecret({
            socialId,
            kind,
            workspaceUuid: null,
            key
          })
          await accountClient.deleteIntegration({
            socialId,
            kind,
            workspaceUuid: null
          })
        }
      } else if (!wasAccessEnabled && accessEnabled) {
        // Access enabled
        if (integrationGlobal === null) {
          await accountClient.createIntegration({
            socialId,
            kind,
            workspaceUuid: null
          })
        }
        await accountClient.addIntegrationSecret({
          socialId,
          kind,
          workspaceUuid: null,
          key,
          secret: password
        })
        await accountClient.createIntegration({
          socialId,
          kind,
          workspaceUuid
        })
      }
      dispatch('close', true)
    } catch (err: any) {
      error = `${err.message ?? 'Unable to save CalDAV intergration'}`
      console.error('Failed to save CalDAV integration', err)
    } finally {
      loading = false
    }
  }

  async function copyServer (): Promise<void> {
    await copyTextToClipboard(serverUrl ?? '')
    isServerUrlCopied = true
    clearTimeout(serverUrlCopyTimeout)
    serverUrlCopyTimeout = setTimeout(() => {
      isServerUrlCopied = false
    }, 2000)
  }

  async function copyAccount (): Promise<void> {
    await copyTextToClipboard(selectedSocialId?.value ?? '')
    isAccountCopied = true
    clearTimeout(accountCopyTimeout)
    accountCopyTimeout = setTimeout(() => {
      isAccountCopied = false
    }, 2000)
  }

  async function copyPassword (): Promise<void> {
    await copyTextToClipboard(password)
    isPasswordCopied = true
    clearTimeout(passwordCopyTimeout)
    passwordCopyTimeout = setTimeout(() => {
      isPasswordCopied = false
    }, 2000)
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
          showTooltip={{ label: isServerUrlCopied ? presentation.string.DocumentUrlCopied : presentation.string.Copy }}
          on:click={copyServer}
        />
      </div>
    </div>

    <div class="flex-col-stretch flex-gap-1-5" class:accessDisabled={!accessEnabled}>
      <Label label={calendar.string.CalDavAccessAccount} />
      <div class="flex-row-center flex-gap-1">
        <EditBox bind:value={hulySocialId} kind="ghost" fullSize focusable disabled={true} />
        <Button
          icon={IconCopy}
          size="small"
          kind="ghost"
          showTooltip={{ label: isServerUrlCopied ? presentation.string.DocumentUrlCopied : presentation.string.Copy }}
          disabled={!accessEnabled}
          on:click={copyAccount}
        />
      </div>
    </div>

    {#if !wasAccessEnabled && !loading}
      <div
        class="flex-col-stretch flex-gap-1-5"
        class:accessDisabled={!accessEnabled}
        transition:slide={{ duration: 300, easing: quintOut }}
      >
        <Label label={calendar.string.CalDavAccessPassword} />
        <div class="flex-row-center flex-gap-1">
          <EditBox bind:value={password} kind="ghost" format="password" fullSize focusable disabled={true} />
          <Button
            icon={IconCopy}
            size="small"
            kind="ghost"
            disabled={!accessEnabled}
            showTooltip={{
              label: isServerUrlCopied ? presentation.string.DocumentUrlCopied : presentation.string.Copy
            }}
            on:click={copyPassword}
          />
        </div>
        {#if canSave}
          <div class:accessDisabled={!accessEnabled} transition:slide={{ duration: 300, easing: quintOut }}>
            <Label label={calendar.string.CalDavAccessPasswordWarning} />
          </div>
        {/if}
      </div>
    {/if}

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
