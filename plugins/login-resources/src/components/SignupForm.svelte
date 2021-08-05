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
  import { getContext, createEventDispatcher } from 'svelte'
  import { Status, Severity } from '@anticrm/platform'

  import Form from './Form.svelte'
  import { doLogin } from '../utils'

  const dispatch = createEventDispatcher()

  const fields = [
    { name: 'first', i18n: 'First name', short: true },
    { name: 'last', i18n: 'Last name', short: true },
    { name: 'username', i18n: 'Email' },
    { name: 'workspace', i18n: 'Workspace' },
    { name: 'password', i18n: 'Password', password: true },
    { name: 'password2', i18n: 'Repeat password', password: true },
  ]

  const object = {
    first: '',
    last: '',
    workspace: '',
    username: '',
    password: '',
    password2: '',
  }

  let status = new Status(Severity.OK, 0, '')

  const action = { 
    i18n: 'Sign Up',
    func: async () => { 
      status = new Status(Severity.INFO, 0, 'Соединяюсь с сервером...')

      const [loginStatus, result] = await doLogin(object.username, object.password, object.workspace)

      return new Promise<void>((resolve, reject) => {
        setTimeout(() => { 
          status = loginStatus
          resolve() 
        }, 1000)
      })
    }
  }


</script>

<Form caption="Sign Up" {status} {fields} {object} {action}
  bottomCaption="Already have an account?"
  bottomActionLabel="Log In"
  bottomActionFunc={() => { dispatch('switch', 'login') }}
/>
