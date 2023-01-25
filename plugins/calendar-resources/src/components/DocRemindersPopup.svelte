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
  import { EmployeeAccount } from '@hcengineering/contact'
  import { Class, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Button, showPopup, Label, Scroller, IconAdd, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { Table } from '@hcengineering/view-resources'
  import calendar from '../plugin'
  import CreateReminder from './CreateReminder.svelte'

  export let attachedTo: Ref<Doc>
  export let attachedToClass: Ref<Class<Doc>>
  export let title: string | undefined

  function click (ev: Event): void {
    showPopup(CreateReminder, { attachedTo, attachedToClass, title }, ev.target as HTMLElement)
  }

  const currentUser = getCurrentAccount() as EmployeeAccount
  $: isMobile = $deviceInfo.isMobile
</script>

<div class="notifyPopup" class:min-w-168={!isMobile}>
  <div class="header flex-between">
    <span class="fs-title overflow-label"><Label label={calendar.string.Reminders} /></span>
    <Button icon={IconAdd} size={'medium'} kind={'transparent'} on:click={(e) => click(e)} />
  </div>
  <Scroller>
    <div class="px-4 clear-mins">
      <Table
        _class={calendar.mixin.Reminder}
        config={['']}
        options={{}}
        query={{ attachedTo, state: 'active', participants: currentUser.employee }}
        hiddenHeader
      />
    </div>
  </Scroller>
</div>
