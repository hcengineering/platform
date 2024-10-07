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
  import { LoginInfo, Workspace } from '@hcengineering/login'
  import { OK, Severity, Status } from '@hcengineering/platform'
  import presentation, { NavLink, isAdminUser, reduceCalls } from '@hcengineering/presentation'
  import {
    Button,
    Label,
    Scroller,
    SearchEdit,
    deviceOptionsStore as deviceInfo,
    setMetadataLocalStorage,
    ticker
  } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import login from '../plugin'
  import { getAccount, getHref, getWorkspaces, goTo, navigateToWorkspace, selectWorkspace } from '../utils'
  import StatusControl from './StatusControl.svelte'

  export let navigateUrl: string | undefined = undefined
  let workspaces: Workspace[] = []

  let status = OK

  let account: LoginInfo | undefined = undefined

  let flagToUpdateWorkspaces = false

  async function loadAccount (): Promise<void> {
    account = await getAccount()
  }

  const updateWorkspaces = reduceCalls(async function updateWorkspaces (time: number): Promise<void> {
    try {
      workspaces = await getWorkspaces()
    } catch (e) {
      // we should be able to continue from this state
    }
  })

  $: if (flagToUpdateWorkspaces) updateWorkspaces($ticker)

  onMount(() => {
    void loadAccount()
  })

  async function select (workspace: string): Promise<void> {
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const [loginStatus, result] = await selectWorkspace(workspace)
    status = loginStatus

    navigateToWorkspace(workspace, result, navigateUrl)
  }

  async function _getWorkspaces (): Promise<void> {
    try {
      const res = await getWorkspaces()

      if (res.length === 0 && account?.confirmed === false) {
        goTo('confirmationSend')
      }

      workspaces = res
      await updateWorkspaces(0)
      flagToUpdateWorkspaces = true
    } catch (err: any) {
      setMetadataLocalStorage(login.metadata.LastToken, null)
      setMetadataLocalStorage(presentation.metadata.Token, null)
      setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
      setMetadataLocalStorage(login.metadata.LoginEmail, null)
      goTo('login')
      throw err
    }
  }
  $: isAdmin = isAdminUser()

  let search: string = ''
</script>

<form class="container" style:padding={$deviceInfo.docWidth <= 480 ? '1.25rem' : '5rem'}>
  <div class="grow-separator" />
  <div class="fs-title">
    {account?.email}
  </div>
  <div class="title"><Label label={login.string.SelectWorkspace} /></div>
  <div class="status">
    <StatusControl {status} />
  </div>
  {#if isAdmin}
    <div class="ml-2 mr-2 mb-2 flex-grow">
      <SearchEdit bind:value={search} width={'100%'} />
    </div>
  {/if}
  {#await _getWorkspaces() then}
    <Scroller padding={'.125rem 0'}>
      <div class="form">
        {#each workspaces.filter((it) => search === '' || (it.workspaceName?.includes(search) ?? false) || it.workspace.includes(search)) as workspace}
          {@const wsName = workspace.workspaceName ?? workspace.workspace}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="workspace flex-center fs-title cursor-pointer focused-button bordered form-row"
            on:click={() => select(workspace.workspace)}
          >
            <div class="flex flex-col flex-grow">
              <span class="label overflow-label flex-center">
                {wsName}
                {#if workspace.mode === 'creating'}
                  ({workspace.progress}%)
                {/if}
              </span>
              {#if isAdmin && wsName !== workspace.workspace}
                <span class="text-xs flex-center">
                  {workspace.workspace}
                </span>
              {/if}
            </div>
          </div>
        {/each}
        {#if workspaces.length === 0 && account?.confirmed === true}
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
      {#if workspaces.length}
        <div>
          <span><Label label={login.string.WantAnotherWorkspace} /></span>
          <NavLink href={getHref('createWorkspace')}><Label label={login.string.CreateWorkspace} /></NavLink>
        </div>
      {/if}
      <div>
        <span><Label label={login.string.NotSeeingWorkspace} /></span>
        <NavLink
          href={getHref('login')}
          onClick={() => {
            setMetadataLocalStorage(login.metadata.LastToken, null)
            setMetadataLocalStorage(presentation.metadata.Token, null)
            setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
            setMetadataLocalStorage(login.metadata.LoginEmail, null)
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
