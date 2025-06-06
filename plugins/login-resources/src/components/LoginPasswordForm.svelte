<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { type IntlString, OK, Severity, Status } from '@hcengineering/platform'
  import { type LoginInfo } from '@hcengineering/account-client'

  import { doLogin, doLoginNavigate } from '../utils'
  import Form from './Form.svelte'
  import { recoveryAction } from '../actions'
  import login from '../plugin'

  export let navigateUrl: string | undefined = undefined
  export let signUpDisabled = false
  export let email: string | undefined = undefined
  export let caption: IntlString = login.string.LogIn
  export let subtitle: string | undefined = undefined
  export let onLogin: ((loginInfo: LoginInfo | null, status: Status) => void | Promise<void>) | undefined = undefined

  $: fields = [
    { id: 'email', name: 'username', i18n: login.string.Email, disabled: email !== undefined && email !== '' },
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

  $: if (email !== undefined && email !== '' && object.username === '') {
    object.username = email
  }

  let status = OK

  const action = {
    i18n: login.string.LogIn,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
      const [loginStatus, result] = await doLogin(object.username, object.password)
      status = loginStatus

      if (onLogin !== undefined) {
        void onLogin(result, status)
      } else {
        await doLoginNavigate(
          result,
          (st) => {
            status = st
          },
          navigateUrl
        )
      }
    }
  }
</script>

<Form
  {caption}
  {subtitle}
  {status}
  {fields}
  {object}
  {action}
  {signUpDisabled}
  bottomActions={[recoveryAction]}
  ignoreInitialValidation
  withProviders
/>
