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
  import { getMetadata, OK, setMetadata, Severity, Status } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import {
    fetchMetadataLocalStorage,
    getCurrentLocation,
    Location,
    navigate,
    setMetadataLocalStorage,
    ticker
  } from '@hcengineering/ui'

  import { doLogin, getAccount, getWorkspaces, navigateToWorkspace, selectWorkspace } from '../utils'
  import Form from './Form.svelte'

  import { LoginInfo } from '@hcengineering/login'
  import login from '../plugin'

  export let navigateUrl: string | undefined = undefined

  const fields = [
    { id: 'email', name: 'username', i18n: login.string.Email },
    {
      id: 'current-password',
      name: 'password',
      i18n: login.string.Password,
      password: true
    }
  ]

  const object = {
    username: '',
    password: ''
  }

  async function doLoginNavigate (
    result: LoginInfo | undefined,
    updateStatus: (status: Status<any>) => void,
    token?: string
  ): Promise<boolean> {
    if (result !== undefined) {
      if (result.token != null && getMetadata(presentation.metadata.Token) === result.token) {
        return false
      }
      setMetadata(presentation.metadata.Token, token ?? result.token)
      setMetadataLocalStorage(login.metadata.LastToken, token ?? result.token)
      setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
      setMetadataLocalStorage(login.metadata.LoginEmail, result.email)

      if (navigateUrl !== undefined) {
        try {
          const loc = JSON.parse(decodeURIComponent(navigateUrl)) as Location
          const workspace = loc.path[1]
          if (workspace !== undefined) {
            const workspaces = await getWorkspaces()
            if (workspaces.find((p) => p.workspace === workspace) !== undefined) {
              updateStatus(new Status(Severity.INFO, login.status.ConnectingToServer, {}))

              const [loginStatus, result] = await selectWorkspace(workspace)
              updateStatus(loginStatus)
              navigateToWorkspace(workspace, result, navigateUrl)
              return true
            }
          }
        } catch (err: any) {
          // Json parse error could be ignored
        }
      }
      const loc = getCurrentLocation()
      loc.path[1] = result.confirmed ? 'selectWorkspace' : 'confirmationSend'
      loc.path.length = 2
      if (navigateUrl !== undefined) {
        loc.query = { ...loc.query, navigateUrl }
      }
      navigate(loc)
      return true
    }
    return false
  }

  let status = OK

  const action = {
    i18n: login.string.LogIn,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
      const [loginStatus, result] = await doLogin(object.username, object.password)
      status = loginStatus
      await doLoginNavigate(result, (st) => {
        status = st
      })
    }
  }

  const recoveryAction = {
    caption: login.string.ForgotPassword,
    i18n: login.string.Recover,
    func: () => {
      const loc = getCurrentLocation()
      loc.path[1] = 'password'
      loc.path.length = 2
      navigate(loc)
    }
  }

  async function chooseToken (time: number): Promise<void> {
    if (getMetadata(presentation.metadata.Token) == null) {
      const lastToken = fetchMetadataLocalStorage(login.metadata.LastToken)
      if (lastToken != null) {
        try {
          const info = await getAccount(false, lastToken)
          if (info !== undefined) {
            await doLoginNavigate(
              info,
              (st) => {
                status = st
              },
              lastToken
            )
          }
        } catch (err: any) {
          setMetadataLocalStorage(login.metadata.LastToken, null)
        }
      }
    }
  }

  $: chooseToken($ticker)
</script>

<Form
  caption={login.string.LogIn}
  {status}
  {fields}
  {object}
  {action}
  bottomActions={[recoveryAction]}
  ignoreInitialValidation
/>
