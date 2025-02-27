<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { OK, Severity, Status } from '@hcengineering/platform'
  import { Location, getCurrentLocation, navigate } from '@hcengineering/ui'

  import { checkJoined, join, setLoginInfo, signUpJoin } from '../utils'
  import Form from './Form.svelte'

  import { Analytics } from '@hcengineering/analytics'
  import { workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import { BottomAction } from '..'
  import { loginAction, recoveryAction } from '../actions'
  import login from '../plugin'

  const location = getCurrentLocation()
  Analytics.handleEvent('invite_link_activated')
  let page = 'signUp'

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
    i18n: page === 'login' ? login.string.Join : login.string.SignUp,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] =
        page === 'login'
          ? await join(object.username, object.password, location.query?.inviteId ?? '')
          : await signUpJoin(
            object.username,
            object.password,
            object.first,
            object.last,
            location.query?.inviteId ?? ''
          )
      status = loginStatus

      if (result !== undefined) {
        setLoginInfo(result)

        if (location.query?.navigateUrl != null) {
          try {
            const loc = JSON.parse(decodeURIComponent(location.query.navigateUrl)) as Location
            if (loc.path[1] === result.workspace) {
              navigate(loc)
              return
            }
          } catch (err: any) {
            // Json parse error could be ignored
          }
        }

        navigate({ path: [workbenchId, result.workspace] })
      }
    }
  }

  $: secondaryButtonLabel = page === 'login' ? login.string.SignUp : login.string.Join
  $: secondaryButtonAction = page === 'login'
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
    if (location.query?.inviteId === undefined || location.query?.inviteId === null) return
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
    const [, result] = await checkJoined(location.query.inviteId)
    status = OK
    if (result !== undefined) {
      setLoginInfo(result)

      if (location.query?.navigateUrl != null) {
        try {
          const loc = JSON.parse(decodeURIComponent(location.query.navigateUrl)) as Location
          if (loc.path[1] === result.workspace) {
            navigate(loc)
            return
          }
        } catch (err: any) {
          // Json parse error could be ignored
        }
      }
      navigate({ path: [workbenchId, result.workspace] })
    }
  }
</script>

<Form
  caption={login.string.Join}
  {status}
  {fields}
  {object}
  {action}
  {secondaryButtonLabel}
  {secondaryButtonAction}
  bottomActions={[loginAction, recoveryAction]}
  withProviders
/>
