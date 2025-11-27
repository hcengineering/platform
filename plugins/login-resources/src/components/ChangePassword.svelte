<!--
// Copyright © 2025 Hardcore Engineering Inc.
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

  import { getCurrentLocation, navigate } from '@hcengineering/ui'
  import login from '../plugin'
  import type { Field } from '../types'
  import { changePassword } from '../utils'
  import { getPasswordValidationRules } from '../validations'
  import Form from './Form.svelte'

  const fields: Array<Field> = [
    { id: 'old-password', name: 'oldPassword', i18n: login.string.CurrentPassword, password: true },
    {
      id: 'new-password',
      name: 'password',
      i18n: login.string.NewPassword,
      password: true,
      rules: getPasswordValidationRules()
    },
    { id: 'new-password', name: 'password2', i18n: login.string.RepeatNewPassword, password: true }
  ]

  const object = {
    oldPassword: '',
    password: '',
    password2: ''
  }

  let status: Status<any> = OK

  const action = {
    i18n: login.string.ChangePassword,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      await changePassword(object.oldPassword, object.password)

      status = OK
      const loc = getCurrentLocation()
      loc.path[1] = 'selectWorkspace'
      loc.path.length = 2

      navigate(loc)
    }
  }
</script>

<Form caption={login.string.ChangePassword} {status} {fields} {object} {action} />
