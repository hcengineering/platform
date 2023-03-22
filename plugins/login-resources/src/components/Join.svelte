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
  import { OK, setMetadata, Severity, Status } from '@hcengineering/platform'
  import { fetchMetadataLocalStorage, getCurrentLocation, navigate, setMetadataLocalStorage } from '@hcengineering/ui'

  import { checkJoined, join, signUpJoin } from '../utils'
  import Form from './Form.svelte'

  import presentation from '@hcengineering/presentation'
  import { workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import login from '../plugin'

  const location = getCurrentLocation()
  let page = 'login'

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
    i18n: login.string.Join,
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
        setMetadata(presentation.metadata.Token, result.token)
        const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
        tokens[result.workspace] = result.token
        setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
        setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
        setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
        navigate({ path: [workbenchId, result.workspace] })
      }
    }
  }

  $: bottom = page === 'login' ? [signUpAction] : [loginJoinAction]
  $: secondaryButtonLabel = page === 'login' ? login.string.SignUp : undefined
  $: secondaryButtonAction = () => {
    page = 'signUp'
  }

  const signUpAction = {
    caption: login.string.DoNotHaveAnAccount,
    i18n: login.string.SignUp,
    func: () => (page = 'signUp')
  }

  const loginJoinAction = {
    caption: login.string.HaveAccount,
    i18n: login.string.LogIn,
    func: () => (page = 'login')
  }

  const loginAction = {
    caption: login.string.AlreadyJoined,
    i18n: login.string.LogIn,
    func: () => {
      const loc = getCurrentLocation()
      loc.path[1] = 'login'
      loc.query = undefined
      loc.path.length = 2
      navigate(loc)
    }
  }

  const recoveryAction = {
    caption: login.string.ForgotPassword,
    i18n: login.string.Recover,
    func: () => {
      const loc = getCurrentLocation()
      loc.path[1] = 'password'
      loc.query = undefined
      loc.path.length = 2
      navigate(loc)
    }
  }

  onMount(() => {
    check()
  })

  async function check () {
    if (location.query?.inviteId === undefined || location.query?.inviteId === null) return
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
    const [, result] = await checkJoined(location.query.inviteId)
    status = OK
    if (result !== undefined) {
      const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
      setMetadata(presentation.metadata.Token, result.token)
      tokens[result.workspace] = result.token
      setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
      setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
      setMetadataLocalStorage(login.metadata.LoginEmail, result.email)

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
  bottomActions={[...bottom, loginAction, recoveryAction]}
/>
