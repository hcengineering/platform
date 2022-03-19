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
  import { OK, Status, Severity } from '@anticrm/platform'
  import { getCurrentLocation, navigate, setMetadataLocalStorage } from '@anticrm/ui'

  import Form from './Form.svelte'
  import { join, signUpJoin } from '../utils'

  import login from '../plugin'
  import workbench from '@anticrm/workbench'

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
          ? await join(object.username, object.password, location.query?.workspace ?? '')
          : await signUpJoin(
            object.username,
            object.password,
            object.first,
            object.last,
            location.query?.workspace ?? ''
          )
      status = loginStatus

      if (result !== undefined) {
        setMetadataLocalStorage(login.metadata.LoginToken, result.token)
        setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
        setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
        setMetadataLocalStorage(login.metadata.CurrentWorkspace, location.query?.workspace ?? '')
        navigate({ path: [workbench.component.WorkbenchApp] })
      }
    }
  }

  $: bottomCaption = page === 'login' ? login.string.DoNotHaveAnAccount : login.string.DoNotHaveAnAccount
  $: bottomActionLabel = page === 'login' ? login.string.SignUp : login.string.LogIn
</script>

<Form
  caption={login.string.Join}
  {status}
  {fields}
  {object}
  {action}
  {bottomCaption}
  {bottomActionLabel}
  bottomActionFunc={() => {
    page = page === 'login' ? 'signUp' : 'login'
  }}
/>
