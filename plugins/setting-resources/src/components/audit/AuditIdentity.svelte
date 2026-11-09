<!--
//
// Copyright © 2026 TraceX SAS.
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
//
-->
<script lang="ts">
  import { employeeByAccountStore, EmployeePresenter } from '@hcengineering/contact-resources'
  import type { AccountUuid } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import setting from '../../plugin'

  export let account: string | undefined = undefined
  export let service: string | undefined = undefined

  // AccountUuid shares PersonUuid when an account exists (core/classes.ts).
  // A person without a workspace employee is displayed using the stored UUID below.
  $: person = account !== undefined ? $employeeByAccountStore.get(account as AccountUuid) : undefined
</script>

{#if service}
  <span class="select-text">{service}</span>
{:else if person !== undefined}
  <EmployeePresenter value={person} avatarSize="x-small" showPopup={false} colorInherit noUnderline disabled />
{:else if account}
  <span class="identity select-text">{account}</span>
{:else}
  <span class="content-dark-color"><Label label={setting.string.UnknownActor} /></span>
{/if}

<style lang="scss">
  .identity {
    overflow-wrap: anywhere;
  }
</style>
