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
  import { OK, Status, Severity, setMetadata } from '@anticrm/platform'
  import { getCurrentLocation, navigate, setMetadataLocalStorage } from '@anticrm/ui'

  import Form from './Form.svelte'
  import { doLogin } from '../utils'

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

  let status = OK

  const action = {
    i18n: login.string.LogIn,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] = await doLogin(object.username, object.password)
      status = loginStatus

      if (result !== undefined) {
        setMetadata(login.metadata.LoginToken, result.token)
        setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
        setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
        const loc = getCurrentLocation()
        loc.path[1] = 'selectWorkspace'
        loc.path.length = 2
        if (navigateUrl !== undefined) {
          loc.query = { ...loc.query, navigateUrl }
        }
        navigate(loc)
      }
    }
  }
</script>

<Form
  caption={login.string.LogIn}
  {status}
  {fields}
  {object}
  {action}
  bottomCaption={login.string.DoNotHaveAnAccount}
  bottomActionLabel={login.string.SignUp}
  bottomActionFunc={() => {
    const loc = getCurrentLocation()
    loc.path[1] = 'signup'
    loc.path.length = 2
    navigate(loc)
  }}
/>
