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
  import { OK, Severity, Status, setMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { getCurrentLocation, navigate } from '@hcengineering/ui'
  import login from '../plugin'
  import { signUp } from '../utils'
  import Form from './Form.svelte'

  const fields = [
    { id: 'given-name', name: 'first', i18n: login.string.FirstName, short: true },
    { id: 'family-name', name: 'last', i18n: login.string.LastName, short: true },
    { id: 'email', name: 'username', i18n: login.string.Email },
    { id: 'new-password', name: 'password', i18n: login.string.Password, password: true },
    { id: 'new-password', name: 'password2', i18n: login.string.PasswordRepeat, password: true }
  ]

  const object = {
    first: '',
    last: '',
    username: '',
    password: '',
    password2: ''
  }

  let status: Status<any> = OK

  const action = {
    i18n: login.string.SignUp,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] = await signUp(object.username, object.password, object.first, object.last)

      status = loginStatus

      if (result !== undefined) {
        setMetadata(presentation.metadata.Token, result.token)
        const loc = getCurrentLocation()
        loc.path[1] = 'confirmationSend'
        loc.path.length = 2
        navigate(loc)
      }
    }
  }
</script>

<Form caption={login.string.SignUp} {status} {fields} {object} {action} />
