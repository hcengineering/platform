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
  import { LoginInfo, RegionInfo } from '@hcengineering/login'
  import { createWorkspace, getAccountDisplayName, getRegionInfo, setLoginInfo } from '@hcengineering/login-resources'
  import { Status, Severity, OK, getEmbeddedLabel } from '@hcengineering/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import { ButtonMenu } from '@hcengineering/ui'

  import Form from './Form.svelte'
  import onboard from '../plugin'

  export let account: LoginInfo

  const dispatch = createEventDispatcher()

  const fields = [{ id: 'workspace', name: 'workspace', i18n: onboard.string.Workspace }]

  const object = {
    workspace: ''
  }

  let status: Status<any> = OK
  let regions: RegionInfo[] = []
  let selectedRegion: string = ''

  onMount(async () => {
    regions = (await getRegionInfo())?.filter((it) => it.name.length > 0) ?? []
    selectedRegion = regions[0]?.region
  })

  const action = {
    i18n: onboard.string.CreateWorkspace,
    func: async () => {
      status = new Status(Severity.INFO, onboard.status.ConnectingToServer, {})

      const [loginStatus, result] = await createWorkspace(object.workspace, selectedRegion)
      status = loginStatus

      if (result != null) {
        setLoginInfo(result)
        dispatch('step', result)
      }
    }
  }
</script>

<Form
  caption={onboard.string.CreateWorkspace}
  subtitle={getAccountDisplayName(account)}
  {status}
  {fields}
  {object}
  {action}
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
