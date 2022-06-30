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
  import { Status, Severity, OK } from '@anticrm/platform'

  import Form from './Form.svelte'
  import { createWorkspace } from '../utils'
  import { getCurrentLocation, navigate, setMetadataLocalStorage, showPopup } from '@anticrm/ui'
  import login from '../plugin'
  import { workbenchId } from '@anticrm/workbench'
  import InviteLink from './InviteLink.svelte'

  const fields = [{ name: 'workspace', i18n: login.string.Workspace, rule: /^[0-9a-z#%&^\-@!)(]{3,63}$/ }]

  const object = {
    workspace: ''
  }

  let status: Status<any> = OK

  const action = {
    i18n: login.string.CreateWorkspace,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] = await createWorkspace(object.workspace)
      status = loginStatus

      if (result !== undefined) {
        setMetadataLocalStorage(login.metadata.LoginToken, result.token)
        setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
        setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
        setMetadataLocalStorage(login.metadata.CurrentWorkspace, object.workspace)
        showPopup(InviteLink, {}, undefined, () => {
          navigate({ path: [workbenchId] })
        })
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
  bottomCaption={login.string.HaveWorkspace}
  bottomActionLabel={login.string.SelectWorkspace}
  bottomActionFunc={() => {
    const loc = getCurrentLocation()
    loc.path[1] = 'selectWorkspace'
    loc.path.length = 2
    navigate(loc)
  }}
/>
