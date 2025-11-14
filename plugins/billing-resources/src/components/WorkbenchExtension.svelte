<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { onMount } from 'svelte'

  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import { pushRootBarComponent } from '@hcengineering/ui'
  import presentation from '@hcengineering/presentation'

  import billing from '../plugin'
  import { getWorkspaceInfo } from '../utils'

  onMount(async () => {
    try {
      const paymentUrl = getMetadata(presentation.metadata.PaymentUrl)
      if (paymentUrl == null || paymentUrl === '') {
        return
      }
      const currentAccount = getCurrentAccount()
      if (currentAccount == null) {
        return
      }
      const workspaceInfo = await getWorkspaceInfo()
      if (workspaceInfo == null) {
        return
      }
      const showExtension: boolean =
        workspaceInfo.billingAccount === currentAccount.uuid ||
        hasAccountRole(currentAccount, AccountRole.Owner) ||
        hasAccountRole(currentAccount, AccountRole.Maintainer)

      if (showExtension) {
        pushRootBarComponent('right', billing.component.UsageExtension, 10)
      }
    } catch (e) {
      console.error('Failed to load WorkbenchExtension:', e)
    }
  })
</script>

<div id="recorder-workbench-ext" class="hidden" />
