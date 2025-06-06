<!--
// Copyright © 2023 Hardcore Engineering Inc.
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

  import { getCurrentLocation } from '@hcengineering/ui'
  import { logIn } from '@hcengineering/workbench'
  import login from '../plugin'
  import type { Field } from '../types'
  import { goTo, restorePassword } from '../utils'
  import Form from './Form.svelte'
  import { getPasswordValidationRules } from '../validations'

  const fields: Array<Field> = [
    {
      id: 'new-password',
      name: 'password',
      i18n: login.string.Password,
      password: true,
      rules: getPasswordValidationRules()
    },
    { id: 'new-password', name: 'password2', i18n: login.string.PasswordRepeat, password: true }
  ]

  const object = {
    password: '',
    password2: ''
  }

  let status: Status<any> = OK

  const action = {
    i18n: login.string.Recover,
    func: async () => {
      const location = getCurrentLocation()
      if (location.query?.id === undefined || location.query?.id === null) return
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] = await restorePassword(location.query?.id, object.password)

      status = loginStatus

      if (result != null) {
        await logIn(result)
        goTo('selectWorkspace')
      }
    }
  }
</script>

<Form caption={login.string.PasswordRecovery} {status} {fields} {object} {action} />
