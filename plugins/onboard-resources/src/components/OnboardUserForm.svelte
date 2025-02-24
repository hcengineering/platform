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
  import { changeUsername } from '@hcengineering/login-resources'
  import { OK, Severity, Status, unknownError } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import onboard from '../plugin'
  import Form from './Form.svelte'

  export let account: LoginInfo

  const dispatch = createEventDispatcher()

  const fields = [
    { id: 'given-name', name: 'first', i18n: onboard.string.FirstName, short: true },
    { id: 'family-name', name: 'last', i18n: onboard.string.LastName, short: true }
  ]

  const object = { first: '', last: '' }

  let status: Status<any> = OK

  const action = {
    i18n: onboard.string.Next,
    func: async () => {
      status = new Status(Severity.INFO, onboard.status.ConnectingToServer, {})

      try {
        await changeUsername(object.first, object.last)
        status = OK
        dispatch('step')
      } catch (err) {
        status = unknownError(err)
      }
    }
  }
</script>

<Form
  caption={onboard.string.FillInProfile}
  subtitle={account.email}
  {status}
  {fields}
  {object}
  {action}
  bottomActions={[
    {
      i18n: onboard.string.Skip,
      func: () => {
        dispatch('step')
      }
    }
  ]}
/>
