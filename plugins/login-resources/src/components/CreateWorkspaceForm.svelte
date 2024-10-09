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
  import { Status, Severity, OK } from '@hcengineering/platform'

  import Form from './Form.svelte'
  import { createWorkspace, getAccount, getRegionInfo, goTo, setLoginInfo, type RegionInfo } from '../utils'
  import { getCurrentLocation, navigate, DropdownLabels } from '@hcengineering/ui'
  import login from '../plugin'
  import { workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import { LoginInfo } from '@hcengineering/login'

  const fields = [
    {
      id: 'workspace',
      name: 'workspace',
      i18n: login.string.Workspace,
      rules: []
    }
  ]

  const object = {
    workspace: ''
  }

  let status: Status<any> = OK

  let account: LoginInfo | undefined = undefined
  let regions: RegionInfo[] = []
  let selectedRegion: string = ''

  onMount(async () => {
    account = await getAccount()
    regions = (await getRegionInfo()) ?? []
    selectedRegion = regions[0]?.region
    if (account?.confirmed === false) {
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

      const [loginStatus, result] = await createWorkspace(object.workspace, selectedRegion)
      status = loginStatus

      if (result !== undefined) {
        setLoginInfo(result as any)

        navigate({ path: [workbenchId, result.workspace] })
      }
    }
  }
</script>

{#if regions.length > 1}
  <div class="flex flex-reverse p-3">
    <DropdownLabels bind:selected={selectedRegion} items={regions.map((it) => ({ id: it.region, label: it.name }))} />
  </div>
{/if}

<Form
  caption={login.string.CreateWorkspace}
  {status}
  {fields}
  {object}
  {action}
  subtitle={account?.email}
  bottomActions={[
    {
      caption: login.string.HaveWorkspace,
      i18n: login.string.SelectWorkspace,
      page: 'selectWorkspace',
      func: () => {
        goTo('selectWorkspace')
      }
    }
  ]}
/>
