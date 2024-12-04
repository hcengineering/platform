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
  import { OK, Severity, Status, getEmbeddedLabel } from '@hcengineering/platform'
  import { LoginInfo } from '@hcengineering/login'
  import { ButtonMenu, getCurrentLocation, navigate } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import login from '../plugin'
  import { createWorkspace, getAccount, getRegionInfo, goTo, setLoginInfo, type RegionInfo } from '../utils'
  import Form from './Form.svelte'

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
  let loginInfo: LoginInfo | null | undefined
  let regions: RegionInfo[] = []
  let selectedRegion: string = ''

  onMount(async () => {
    loginInfo = await getAccount()
    // Show only regions with specified name
    regions = (await getRegionInfo())?.filter((it) => it.name.length > 0) ?? []
    selectedRegion = regions[0]?.region

    if (loginInfo?.token == null) {
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

      if (result != null) {
        setLoginInfo(result as any)
        navigate({ path: [workbenchId, result.workspace] })
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
  subtitle={loginInfo?.account}
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
>
  <svelte:fragment slot="region-selector">
    {#if regions.length > 1}
      <div class="flex flex-grow flex-reverse">
        <ButtonMenu
          bind:selected={selectedRegion}
          autoSelectionIfOne
          title={regions.find((it) => it.region === selectedRegion)?.name}
          items={regions.map((it) => ({ id: it.region, label: getEmbeddedLabel(it.name) }))}
          on:selected={(it) => {
            selectedRegion = it.detail
          }}
        />
      </div>
    {/if}
  </svelte:fragment>
</Form>
