<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { onMount } from 'svelte'
  import { Analytics } from '@hcengineering/analytics'
  import { workbenchId } from '@hcengineering/workbench'
  import { OK, Severity, Status } from '@hcengineering/platform'
  import { Location, getCurrentLocation, navigate } from '@hcengineering/ui'
  import { loginId } from '@hcengineering/login'

  import Form from './Form.svelte'
  import { setLoginInfo, checkAutoJoin, isWorkspaceLoginInfo } from '../utils'
  import { loginAction, recoveryAction } from '../actions'
  import login from '../plugin'

  const location = getCurrentLocation()
  Analytics.handleEvent('auto_join_invite_link_activated')

  const fields = [
    { id: 'email', name: 'username', i18n: login.string.Email, disabled: true },
    {
      id: 'current-password',
      name: 'password',
      i18n: login.string.Password,
      password: true
    }
  ]

  $: object = {
    username: '',
    password: ''
  }

  let status = OK

  $: action = {
    i18n: login.string.Join,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      await check()
    }
  }

  onMount(() => {
    void check()
  })

  async function check (): Promise<void> {
    if (location.query?.inviteId == null || location.query?.firstName == null) return
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const [, result] = await checkAutoJoin(
      location.query.inviteId,
      location.query.firstName,
      location.query.lastName ?? ''
    )
    status = OK
    if (result != null) {
      if (isWorkspaceLoginInfo(result)) {
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
      } else {
        if (result.email == null) {
          console.error('No email in auto join info')
          navigate({ path: [loginId, 'login'] })
          return
        }

        object.username = result.email
      }
    }
  }
</script>

<Form
  caption={login.string.Join}
  {status}
  {fields}
  {object}
  {action}
  bottomActions={[loginAction, recoveryAction]}
  withProviders
/>
