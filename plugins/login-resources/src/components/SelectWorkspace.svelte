<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import {
    WorkspaceInfoWithStatus,
    isActiveMode,
    isArchivingMode,
    isRestoringMode,
    isUpgradingMode
  } from '@hcengineering/core'
  import { LoginInfo } from '@hcengineering/login'
  import { OK, Severity, Status } from '@hcengineering/platform'
  import presentation, { MessageBox, NavLink, isAdminUser, reduceCalls } from '@hcengineering/presentation'
  import {
    Button,
    Label,
    Scroller,
    SearchEdit,
    Spinner,
    deviceOptionsStore as deviceInfo,
    showPopup,
    ticker
  } from '@hcengineering/ui'
  import { logOut } from '@hcengineering/workbench'
  import { onMount } from 'svelte'

  import login from '../plugin'
  import {
    getAccount,
    getAccountDisplayName,
    getHref,
    getWorkspaces,
    goTo,
    navigateToWorkspace,
    selectWorkspace,
    unArchive
  } from '../utils'
  import StatusControl from './StatusControl.svelte'

  export let navigateUrl: string | undefined = undefined

  let workspaces: WorkspaceInfoWithStatus[] = []
  let status = OK
  let accountPromise: Promise<LoginInfo | null>
  let account: LoginInfo | null | undefined = undefined

  let flagToUpdateWorkspaces = false

  async function loadAccount (): Promise<void> {
    accountPromise = getAccount()
    account = await accountPromise
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateWorkspaces = reduceCalls(async function updateWorkspaces (_time?: number): Promise<void> {
    try {
      workspaces = await getWorkspaces()
    } catch (e) {
      // we should be able to continue from this state
    }
  })

  $: if (flagToUpdateWorkspaces) {
    void updateWorkspaces($ticker)
  }

  onMount(() => {
    void loadAccount()
  })

  async function select (workspaceUrl: string): Promise<void> {
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const [loginStatus, result] = await selectWorkspace(workspaceUrl)

    const ws = workspaces.find((it) => it.uuid === result?.workspace)
    if (ws != null && isArchivingMode(ws?.mode) && result?.workspace !== undefined) {
      showPopup(MessageBox, {
        label: login.string.SelectWorkspace,
        message: login.string.WorkspaceArchivedDesc,
        canSubmit: true,
        params: {},
        okLabel: login.string.RestoreArchivedWorkspace,
        action: async () => {
          if (await unArchive(ws.uuid, result.token)) {
            workspaces = await getWorkspaces()
            let info = workspaces.find((it) => it.uuid === ws.uuid)
            while (isRestoringMode(info?.mode) || isUpgradingMode(info?.mode)) {
              await new Promise<void>((resolve) => setTimeout(resolve, 5000))
              workspaces = await getWorkspaces()
              info = workspaces.find((it) => it.uuid === ws.uuid)
            }
          }
        }
      })
      status = loginStatus
      return
    }
    status = loginStatus

    navigateToWorkspace(workspaceUrl, result, navigateUrl)
  }

  async function _getWorkspaces (): Promise<void> {
    try {
      const res = await getWorkspaces()

      await accountPromise
      if (res.length === 0 && account?.token == null) {
        goTo('confirmationSend')
      }

      workspaces = res
      await updateWorkspaces()
      flagToUpdateWorkspaces = true
    } catch (err: any) {
      await logOut()
      goTo('login')
      throw err
    }
  }
  let search: string = ''
</script>

<form class="container" style:padding={$deviceInfo.docWidth <= 480 ? '1.25rem' : '5rem'}>
  <div class="grow-separator" />
  <div class="fs-title">
    {#if account != null}
      {getAccountDisplayName(account)}
    {:else}
      <Label label={login.string.LoadingAccount} />
    {/if}
  </div>
  <div class="title"><Label label={login.string.SelectWorkspace} /></div>
  <div class="status">
    <StatusControl {status} />
  </div>
  {#if workspaces.length > 10}
    <div class="ml-2 mr-2 mb-2 flex-grow">
      <SearchEdit bind:value={search} width={'100%'} />
    </div>
  {/if}
  {#await _getWorkspaces()}
    <div class="workspace-loader">
      <Spinner />
    </div>
  {:then}
    <Scroller padding={'.125rem 0'} maxHeight={35}>
      <div class="form">
        {#each workspaces
          .filter((it) => search === '' || (it.name?.includes(search) ?? false) || it.url.includes(search))
          .slice(0, 500) as workspace}
          {@const wsName = workspace.name ?? workspace.url}
          {@const lastUsageDays =
            workspace.lastVisit === undefined
              ? 'N/A'
              : Math.round((Date.now() - workspace.lastVisit) / (1000 * 3600 * 24))}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="workspace flex-center fs-title cursor-pointer focused-button bordered form-row"
            on:click={() => select(workspace.url)}
          >
            <div class="flex flex-col flex-grow">
              <span class="label overflow-label flex-center">
                {wsName}
                {#if isArchivingMode(workspace.mode)}
                  - <Label label={presentation.string.Archived} />
                {/if}
                {#if !isActiveMode(workspace.mode) && !isArchivingMode(workspace.mode)}
                  ({workspace.processingProgress}%)
                {/if}
              </span>
              <span class="text-xs flex-row-center flex-center">
                <div class="text-sm">
                  ({lastUsageDays} days)
                </div>
              </span>
            </div>
          </div>
        {/each}

        {#if workspaces.length === 0 && account?.token != null}
          <div class="form-row send">
            <Button
              label={login.string.CreateWorkspace}
              kind={'primary'}
              width="100%"
              on:click={() => {
                goTo('createWorkspace')
              }}
            />
          </div>
        {/if}
      </div>
    </Scroller>
    <div class="grow-separator" />
    <div class="footer">
      {#if workspaces.length > 0}
        <div>
          <span><Label label={login.string.WantAnotherWorkspace} /></span>
          <NavLink
            href={getHref('createWorkspace')}
            onClick={() => {
              goTo('createWorkspace')
            }}><Label label={login.string.CreateWorkspace} /></NavLink
          >
        </div>
      {/if}
      <div>
        <span><Label label={login.string.NotSeeingWorkspace} /></span>
        <NavLink
          href={getHref('login')}
          onClick={async () => {
            await logOut()
            goTo('login')
          }}
        >
          <Label label={login.string.ChangeAccount} />
        </NavLink>
      </div>
    </div>
  {/await}
</form>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
    overflow: hidden;

    .workspace-loader {
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .title {
      font-weight: 600;
      font-size: 1.5rem;
      color: var(--theme-caption-color);
    }
    .status {
      min-height: 7.5rem;
      max-height: 7.5rem;
      padding-top: 1.25rem;
    }

    .form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 0.75rem;
      row-gap: 1.5rem;

      .form-row {
        grid-column-start: 1;
        grid-column-end: 3;
      }

      .workspace {
        padding: 1rem;
        border-radius: 1rem;
      }
    }
    .grow-separator {
      flex-grow: 1;
    }
    .footer {
      margin-top: 3.5rem;
      font-size: 0.8rem;
      color: var(--theme-caption-color);
      span {
        opacity: 0.8;
      }
      a {
        text-decoration: none;
        color: var(--theme-caption-color);
        opacity: 0.8;
        &:hover {
          opacity: 1;
        }
      }
    }
  }
</style>
