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
  import { Status, Severity, OK, setMetadata } from '@hcengineering/platform'

  import Form from './Form.svelte'
  import { createWorkspace, getAccount } from '../utils'
  import { fetchMetadataLocalStorage, getCurrentLocation, navigate, setMetadataLocalStorage } from '@hcengineering/ui'
  import login from '../plugin'
  import { workbenchId } from '@hcengineering/workbench'
  import presentation from '@hcengineering/presentation'
  import { onMount } from 'svelte'

  const fields = [
    {
      name: 'workspace',
      i18n: login.string.Workspace,
      rules: [
        {
          rule: /^-/,
          notMatch: true,
          ruleDescr: login.string.WorkspaceNameRuleHyphen
        },
        {
          rule: /-$/,
          notMatch: true,
          ruleDescr: login.string.WorkspaceNameRuleHyphenEnd
        },
        {
          rule: /[A-Z]/,
          notMatch: true,
          ruleDescr: login.string.WorkspaceNameRuleCapital
        },
        {
          rule: /^[0-9a-z-]+$/,
          notMatch: false,
          ruleDescr: login.string.WorkspaceNameRule
        },
        {
          rule: /^[0-9a-z-]{3,}$/,
          notMatch: false,
          ruleDescr: login.string.WorkspaceNameRuleLengthLow
        },
        {
          rule: /^[0-9a-z-]{3,63}$/,
          notMatch: false,
          ruleDescr: login.string.WorkspaceNameRuleLengthHigh
        }
      ]
    }
  ]

  const object = {
    workspace: ''
  }

  let status: Status<any> = OK

  onMount(async () => {
    const account = await getAccount()
    if (account?.confirmed !== true) {
      const loc = getCurrentLocation()
      loc.path[1] = 'confirmationSend'
      loc.path.length = 2
      navigate(loc)
    }
  })

  const action = {
    i18n: login.string.CreateWorkspace,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] = await createWorkspace(object.workspace)
      status = loginStatus

      if (result !== undefined) {
        setMetadata(presentation.metadata.Token, result.token)
        const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
        tokens[object.workspace] = result.token
        setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
        setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
        setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
        navigate({ path: [workbenchId, object.workspace] })
      }
    }
  }
</script>

<Form
  caption={login.string.CreateWorkspace}
  {status}
  {fields}
  {object}
  {action}
  bottomActions={[
    {
      caption: login.string.HaveWorkspace,
      i18n: login.string.SelectWorkspace,
      func: () => {
        const loc = getCurrentLocation()
        loc.path[1] = 'selectWorkspace'
        loc.path.length = 2
        navigate(loc)
      }
    }
  ]}
/>
