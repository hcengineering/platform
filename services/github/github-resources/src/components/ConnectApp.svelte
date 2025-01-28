<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { PersonId } from '@hcengineering/core'
  import ui, { Label, Location, Spinner, Button, location } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import github from '../plugin'
  import { sendGHServiceRequest } from './utils'
  import { getMetadata } from '@hcengineering/platform'

  let autoClose = 10

  let promise: Promise<void> | undefined

  let interval: any

  let installationId: number | undefined
  let showSelector = false

  async function createIntegration (loc: Location): Promise<void> {
    if (loc.query?.error != null) {
      window.close()
      return
    }
    installationId = parseInt(loc.query?.installation_id ?? '-1')
    const state = loc.query?.state
    const code = loc.query?.code
    const setupAction = loc.query?.setup_action

    if (state == null) {
      // we need to show a list of workspaces available to install application ito.
      if (setupAction === 'install') {
        // Show error
        showSelector = true
      }
      return
    }

    function doAutoClose (): void {
      autoClose = 3
      clearInterval(interval)
      interval = setInterval(() => {
        autoClose = autoClose - 1
        if (autoClose === 0) {
          clearInterval(interval)
          window.close()
        }
      }, 1000)
    }

    const rawState = JSON.parse(atob(state))
    const { accountId, op, workspace, token }: { accountId: PersonId, workspace: string, op: string, token: string } =
      rawState

    if (op === 'installation') {
      if (installationId == null || setupAction === null) {
        window.close()
        return
      }
      promise = sendGHServiceRequest('installation', {
        installationId,
        workspace,
        accountId,
        token
      }).then(doAutoClose)
    }
    if (code !== null) {
      promise = sendGHServiceRequest('auth', {
        code,
        state,
        workspace,
        accountId
      }).then(doAutoClose)
    }
  }

  onDestroy(
    location.subscribe((loc) => {
      void createIntegration(loc)
    })
  )
</script>

{#if showSelector}
  <div class="flex flex-center flex-col h-full w-full">
    <span class="text-lg">
      <Label label={github.string.SelectWorkspaceToInstallApp} />
    </span>
    <span class="text-lg">
      <Label label={github.string.SelectWorkspaceToInstallAppMsg} />
    </span>
    <a href={`https://github.com/settings/installations/${installationId}`}>
      <Label label={github.string.Configure} params={{ title: getMetadata(ui.metadata.PlatformTitle) }} />
    </a>
  </div>
{:else}
  <div class="flex flex-center fs-title text-center items-center h-full w-full">
    {#await promise}
      <div class="flex flex-row-center flex-center flex-grow">
        <Spinner />
        <div class="ml-1">
          <Label label={github.string.Processing} />
        </div>
      </div>
    {:then}
      <Label label={github.string.AutoClose} params={{ time: autoClose }} />
    {:catch}
      <div class="flex flex-col flex-center flex-gap-4">
        <Label label={github.string.RequestFailed} />
        <Button
          label={github.string.CloseTab}
          kind="primary"
          on:click={() => {
            window.close()
          }}
        />
      </div>
    {/await}
  </div>
{/if}
