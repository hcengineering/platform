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
  import { OK, setMetadata, Severity, Status } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { getCurrentLocation, Location, navigate, setMetadataLocalStorage } from '@hcengineering/ui'

  import { doLogin, getWorkspaces, navigateToWorkspace, selectWorkspace } from '../utils'
  import Form from './Form.svelte'

  import { LoginInfo } from '@hcengineering/login'
  import { recoveryAction } from '../actions'
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
    updateStatus: (status: Status<any>) => void
  ): Promise<void> {
    if (result !== undefined) {
      setMetadata(presentation.metadata.Token, result.token)
      setMetadataLocalStorage(login.metadata.LastToken, result.token)
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
              return
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
    }
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
</script>

<Form
  caption={login.string.LogIn}
  {status}
  {fields}
  {object}
  {action}
  bottomActions={[recoveryAction]}
  ignoreInitialValidation
  withProviders
/>
