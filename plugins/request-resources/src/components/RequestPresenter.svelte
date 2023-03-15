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
  import { Request, RequestStatus } from '@hcengineering/request'
  import { Icon, IconCheck, IconClose, IconInfo } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import TxView from './TxView.svelte'

  export let value: Request
  export let inline: boolean = false

  $: dte = new Date(value.tx.modifiedOn)
</script>

<div class="flex">
  <DocNavLink {inline} object={value}>
    <div class="flex-presenter mr-1" class:inline-presenter={inline}>
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
    </div>
  </DocNavLink>
  <TxView tx={value.tx} />
</div>
