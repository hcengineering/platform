<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { OK, PlatformError, Severity, Status, getMetadata, setMetadata } from '@hcengineering/platform'
  import {
    Button,
    Label,
    Loading,
    Location,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    navigate
  } from '@hcengineering/ui'
  import presentation from '@hcengineering/presentation'

  import { checkJoined, join, joinByToken, setLoginInfo, signUpJoin, getLoginInfo } from '../utils'
  import Form from './Form.svelte'
  import StatusControl from './StatusControl.svelte'

  import { Analytics } from '@hcengineering/analytics'
  import { signupStore } from '@hcengineering/analytics-providers'
  import { logIn, workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import { loginAction, recoveryAction } from '../actions'
  import login from '../plugin'

  const location = getCurrentLocation()
  Analytics.handleEvent('invite_link_activated', { invite_id: location.query?.inviteId })

  const token = getMetadata(presentation.metadata.Token)
  let page = token != null ? 'login' : 'signUp'
  let checking = true
  let showJoinWithAccount = false
  let currentAccountName: string | undefined
  let joiningWithAccount = false

  $: signupStore.setSignUpFlow(page === 'signUp')

  $: fields =
    page === 'login'
      ? [
          { id: 'email', name: 'username', i18n: login.string.Email },
          {
            id: 'current-password',
            name: 'password',
            i18n: login.string.Password,
            password: true
          }
        ]
      : [
          { id: 'given-name', name: 'first', i18n: login.string.FirstName, short: true },
          { id: 'family-name', name: 'last', i18n: login.string.LastName, short: true },
          { id: 'email', name: 'username', i18n: login.string.Email },
          { id: 'new-password', name: 'password', i18n: login.string.Password, password: true },
          { id: 'new-password', name: 'password2', i18n: login.string.PasswordRepeat, password: true }
        ]

  $: object = {
    first: '',
    last: '',
    username: '',
    password: '',
    password2: ''
  }

  let status = OK

  $: action = {
    i18n: page === 'login' ? login.string.LogInAndJoin : login.string.SignUpAndJoin,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] =
        page === 'login'
          ? await join(
            object.username,
            object.password,
            location.query?.inviteId ?? '',
            location.query?.workspace ?? ''
          )
          : await signUpJoin(
            object.username,
            object.password,
            object.first,
            object.last,
            location.query?.inviteId ?? '',
            location.query?.workspace ?? ''
          )
      status = loginStatus

      if (result != null) {
        await logIn(result)
        setLoginInfo(result)

        if (location.query?.navigateUrl != null) {
          try {
            const loc = JSON.parse(decodeURIComponent(location.query.navigateUrl)) as Location
            if (loc.path[1] === result.workspaceUrl) {
              navigate(loc)
              return
            }
          } catch (err: any) {
            // Json parse error could be ignored
          }
        }

        navigate({ path: [workbenchId, result.workspaceUrl] })
      }
    }
  }

  $: secondaryButtonLabel = page === 'login' ? login.string.CreateNewAccount : login.string.HaveAccount
  $: secondaryButtonAction =
    page === 'login'
      ? () => {
          page = 'signUp'
        }
      : () => {
          page = 'login'
        }

  onMount(() => {
    void check()
  })

  async function check (): Promise<void> {
    if (location.query?.inviteId === undefined || location.query?.inviteId === null) {
      checking = false
      return
    }
    checking = true
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const result = await checkJoined(location.query.inviteId)
    status = OK

    if (result != null) {
      setLoginInfo(result)

      if (location.query?.navigateUrl != null) {
        try {
          const loc = JSON.parse(decodeURIComponent(location.query.navigateUrl)) as Location
          if (loc.path[1] === result.workspaceUrl) {
            navigate(loc)
            return
          }
        } catch (err: any) {
          // Json parse error could be ignored
        }
      }
      navigate({ path: [workbenchId, result.workspaceUrl] })
      return
    }

    try {
      const info = await getLoginInfo()
      if (info != null) {
        showJoinWithAccount = true
        currentAccountName = info.name
        if (info.token != null) {
          setMetadata(presentation.metadata.Token, info.token)
        }
      }
    } catch {
      // No session (metadata token or cookie)
    }

    checking = false
  }

  async function handleJoinWithThisAccount (): Promise<void> {
    const inviteId = location.query?.inviteId
    if (inviteId == null) return
    joiningWithAccount = true
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
    try {
      const result = await joinByToken(inviteId)
      await logIn(result)
      setLoginInfo(result)

      if (location.query?.navigateUrl != null) {
        try {
          const loc = JSON.parse(decodeURIComponent(location.query.navigateUrl)) as Location
          if (loc.path[1] === result.workspaceUrl) {
            navigate(loc)
            return
          }
        } catch (err: any) {
          // Json parse error could be ignored
        }
      }
      navigate({ path: [workbenchId, result.workspaceUrl] })
    } catch (err: any) {
      status =
        err instanceof PlatformError ? err.status : new Status(Severity.ERROR, login.status.ConnectingToServer, {})
    } finally {
      joiningWithAccount = false
    }
  }

  function handleUseDifferentAccount (): void {
    setMetadata(presentation.metadata.Token, null)
    showJoinWithAccount = false
    page = 'login'
  }
</script>

{#if checking}
  <div class="join-checking">
    <Loading size="small" shrink={true} />
    <Label label={login.string.ProcessingInvite} />
  </div>
{:else if showJoinWithAccount}
  <div
    class="join-with-account-container"
    style:padding={$deviceInfo.docWidth <= 480 ? '.25rem 1.25rem' : '4rem 5rem'}
    style:min-height={$deviceInfo.docHeight > 720 ? '42rem' : '0'}
  >
    <div class="join-with-account">
      <div class="fs-title">
        <Label label={login.string.InvitedToJoinWorkspace} />
      </div>
      {#if currentAccountName}
        <p class="join-signed-in-as">
          <Label label={login.string.SignedInAs} params={{ name: currentAccountName }} />
        </p>
      {/if}
      {#if status.severity !== Severity.OK}
        <div class="join-status">
          <StatusControl {status} />
        </div>
      {/if}
      <div class="join-with-account-buttons">
        <Button
          dataId="join-with-this-account"
          label={login.string.JoinWithThisAccount}
          kind={'contrast'}
          shape={'round2'}
          size={'large'}
          loading={joiningWithAccount}
          disabled={joiningWithAccount}
          on:click={() => handleJoinWithThisAccount()}
        />
        <Button
          dataId="join-use-different-account"
          label={login.string.UseDifferentAccount}
          size={'large'}
          shape={'round2'}
          disabled={joiningWithAccount}
          on:click={handleUseDifferentAccount}
        />
      </div>
    </div>
  </div>
{:else}
  <Form
    caption={login.string.Join}
    actionButtonDataId="join-form-submit"
    secondaryButtonDataId="join-form-toggle"
    {status}
    {fields}
    {object}
    {action}
    {secondaryButtonLabel}
    {secondaryButtonAction}
    bottomActions={[loginAction, recoveryAction]}
    withProviders
  />
{/if}

<style lang="scss">
  .join-checking {
    display: flex;
    flex-direction: row;
    align-items: center;
    align-self: center;
    gap: 1rem;
    padding: 2rem;
    color: var(--theme-caption-color);
  }

  .join-with-account-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .join-with-account {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0.5rem;

    .join-signed-in-as {
      margin: 0 0 1.5rem;
      font-size: 0.95rem;
      color: var(--theme-content-color);
    }

    .join-status {
      margin-bottom: 1rem;
    }

    .join-with-account-buttons {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;

      :global(button:first-child) {
        width: 100%;
      }
    }
  }
</style>
