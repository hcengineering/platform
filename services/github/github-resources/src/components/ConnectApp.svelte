<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import ui, { Label, Location, Spinner, Button, location } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import github from '../plugin'
  import { sendGHServiceRequest } from './utils'
  import { getMetadata } from '@hcengineering/platform'
  import { resolveGithubConnectAction } from './connectAppUtils'

  let autoClose = 10

  let promise: Promise<void> | undefined

  let interval: any

  let installationId: number | undefined
  let showSelector = false

  async function createIntegration (loc: Location): Promise<void> {
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

    showSelector = false
    const action = resolveGithubConnectAction(loc)
    installationId = action.action === 'selector' ? action.installationId : undefined

    if (action.action === 'close') {
      window.close()
      return
    }

    if (action.action === 'selector') {
      showSelector = true
      return
    }

    if (action.action === 'installation') {
      promise = sendGHServiceRequest('installation', action.payload).then(doAutoClose)
      return
    }

    if (action.action === 'authorize') {
      promise = sendGHServiceRequest('auth', action.payload).then(doAutoClose)
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
