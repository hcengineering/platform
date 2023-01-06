<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact, { EmployeeAccount } from '@hcengineering/contact'
  import { WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Request, RequestStatus } from '@hcengineering/request'
  import { getPanelURI, Icon, IconCheck, IconClose, IconInfo } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import TxView from './TxView.svelte'

  export let value: Request
  export let inline: boolean = false

  const client = getClient()

  $: cl = client.getHierarchy().getClass(value._class)
  $: label = cl.shortLabel

  let accounts: WithLookup<EmployeeAccount>[] = []

  $: client.findAll(contact.class.EmployeeAccount, { _id: { $in: value.requested } }).then((res) => {
    accounts = res
  })
  $: dte = new Date(value.tx.modifiedOn)
</script>

<div class="flex">
  <a
    class="flex-presenter"
    class:inline-presenter={inline}
    href="#{getPanelURI(view.component.EditDoc, value._id, value._class, 'content')}"
  >
    <div class="flex flex-row-center">
      <div class="mr-2">
        {#if value.status === RequestStatus.Completed || value.status === RequestStatus.Rejected}
          <Icon icon={value.status === RequestStatus.Completed ? IconCheck : IconClose} size={'small'} />
        {:else}
          <Icon icon={IconInfo} size={'small'} />
        {/if}
      </div>
      <span class="label nowrap">
        {dte.getMonth() + 1}/{dte.getDay() + 1}-{(dte.getHours() * 60 + dte.getMinutes()).toString(7)}
      </span>
    </div>
  </a>
  <TxView tx={value.tx} />
</div>
