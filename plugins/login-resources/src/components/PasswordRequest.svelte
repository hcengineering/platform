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
  import { MessageBox } from '@hcengineering/presentation'

  import { showPopup } from '@hcengineering/ui'
  import login from '../plugin'
  import { goTo, requestPassword } from '../utils'
  import Form from './Form.svelte'
  import { BottomAction } from '..'
  import { signUpAction } from '../actions'

  export let signUpDisabled = false

  const fields = [{ id: 'email', name: 'username', i18n: login.string.Email }]
  const object = {
    username: ''
  }

  let status: Status<any> = OK

  const action = {
    i18n: login.string.Recover,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const loginStatus = await requestPassword(object.username)
      status = loginStatus
      if (loginStatus === OK) {
        showPopup(
          MessageBox,
          {
            label: login.string.PasswordRecovery,
            message: login.string.RecoveryLinkSent,
            canSubmit: false
          },
          undefined,
          () => {
            goTo('login')
          }
        )
      }
    }
  }

  const bottomActions: BottomAction[] = [
    {
      caption: login.string.KnowPassword,
      i18n: login.string.LogIn,
      page: 'login',
      func: () => {
        goTo('login')
      }
    },
    ...(signUpDisabled ? [] : [signUpAction])
  ]
</script>

<Form caption={login.string.PasswordRecovery} {status} {fields} {object} {action} {bottomActions} />
