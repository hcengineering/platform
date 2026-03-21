<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { OK } from '@hcengineering/platform'
  import { doLoginNavigate, verify2fa } from '../utils'
  import login from '../plugin'
  import Form from './Form.svelte'

  export let navigateUrl: string | undefined = undefined
  export let token: string | undefined = undefined

  const object = {
    code: ''
  }

  let status = OK
  let isLoading = false

  $: fields = [
    {
      id: 'two-factor-code',
      name: 'code',
      i18n: login.string.TwoFactorCode,
      rules: [
        {
          rule: (v: string) => v.length === 6,
          notMatch: false,
          ruleDescr: login.status.IncorrectValue,
          ruleDescrParams: { field: 'code' }
        }
      ]
    }
  ]

  const action = {
    i18n: login.string.Verify,
    func: async () => {
      isLoading = true
      try {
        const [resStatus, loginInfo] = await verify2fa(object.code, token)
        status = resStatus

        if (resStatus === OK && loginInfo != null) {
          await doLoginNavigate(loginInfo, (s) => (status = s), navigateUrl)
        }
      } finally {
        isLoading = false
      }
    }
  }
</script>

<Form caption={login.string.TwoFactorAuth} bind:status {fields} {object} {action} {isLoading} ignoreInitialValidation />
