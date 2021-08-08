<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { createEventDispatcher } from 'svelte'
  import { OK, Status, Severity, setMetadata } from '@anticrm/platform'
  import { navigate } from '@anticrm/ui'

  import Form from './Form.svelte'
  import { doLogin } from '../utils'

  import login from '../plugin'
  import workbench from '@anticrm/workbench'

  const dispatch = createEventDispatcher()

  const fields = [
    { name: 'username', i18n: login.string.Email },
    {
      name: 'password',
      i18n: login.string.Password,
      password: true
    },
    { name: 'workspace', i18n: login.string.Workspace }
  ]

  const object = {
    workspace: '',
    username: '',
    password: '',
  }

  let status = OK

  const action = { 
    i18n: login.string.LogIn,
    func: async () => { 
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] = await doLogin(object.username, object.password, object.workspace)
      status = loginStatus

      if (result !== undefined) {
        console.log('token', result.token)
        setMetadata(login.metadata.LoginToken, result.token)
        setMetadata(login.metadata.LoginEndpoint, result.endpoint)
        navigate({ path: [workbench.component.WorkbenchApp] })
      }
    }
  }


</script>

<Form caption={login.string.LogIn} {status} {fields} {object} {action}
  bottomCaption={login.string.DoNotHaveAnAccount}
  bottomActionLabel={login.string.SignUp}
  bottomActionFunc={() => { dispatch('switch', 'signup') }}
/>
