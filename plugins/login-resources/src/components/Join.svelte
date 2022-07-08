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
  import { OK, Status, Severity, setMetadata } from '@anticrm/platform'
  import { fetchMetadataLocalStorage, getCurrentLocation, navigate, setMetadataLocalStorage } from '@anticrm/ui'
  import { workbenchId } from '@anticrm/workbench'
  import { onMount } from 'svelte'

  import Form from './Form.svelte'
  import { checkJoined, join, selectWorkspace, signUpJoin } from '../utils'

  import login from '../plugin'

  const location = getCurrentLocation()
  let page = 'login'

  onMount(() => {
    check()
  })

  async function check () {
    const [, workspace] = await checkJoined(
      fetchMetadataLocalStorage(login.metadata.LoginEmail) ?? '',
      location.query?.inviteId ?? ''
    )
    if (workspace) {
      const [, result] = await selectWorkspace(workspace)

      if (result !== undefined) {
        setMetadata(login.metadata.LoginToken, result.token)
        const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
        tokens[result.workspace] = result.token
        setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
        setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
        setMetadataLocalStorage(login.metadata.LoginEmail, result.email)

        navigate({ path: [workbenchId, workspace] })
      }
    }
  }

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
        setMetadata(login.metadata.LoginToken, result.token)
        const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
        tokens[result.workspace] = result.token
        setMetadataLocalStorage(login.metadata.LoginToken, result.token)
        setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
        setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
        navigate({ path: [workbenchId, result.workspace] })
      }
    }
  }

  $: bottomCaption = page === 'login' ? login.string.DoNotHaveAnAccount : login.string.HaveAccount
  $: bottomActionLabel = page === 'login' ? login.string.SignUp : login.string.LogIn
  $: secondaryButtonLabel = page === 'login' ? login.string.SignUp : undefined
  $: secondaryButtonAction = () => {
    page = 'signUp'
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
  {bottomCaption}
  {bottomActionLabel}
  bottomActionFunc={() => {
    page = page === 'login' ? 'signUp' : 'login'
  }}
/>
