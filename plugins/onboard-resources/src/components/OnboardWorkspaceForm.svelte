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
  import { LoginInfo } from '@hcengineering/login'
  import { createWorkspace, setLoginInfo } from '@hcengineering/login-resources'
  import { Status, Severity, OK } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  import Form from './Form.svelte'
  import onboard from '../plugin'

  export let account: LoginInfo

  const dispatch = createEventDispatcher()

  const fields = [{ id: 'workspace', name: 'workspace', i18n: onboard.string.Workspace }]

  const object = {
    workspace: ''
  }

  let status: Status<any> = OK

  const action = {
    i18n: onboard.string.CreateWorkspace,
    func: async () => {
      status = new Status(Severity.INFO, onboard.status.ConnectingToServer, {})

      const [loginStatus, result] = await createWorkspace(object.workspace)
      status = loginStatus

      if (result != null) {
        setLoginInfo(result)
        dispatch('step', result)
      }
    }
  }
</script>

<Form caption={onboard.string.CreateWorkspace} subtitle={account.email} {status} {fields} {object} {action} />
