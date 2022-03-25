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
  import { EmployeeAccount } from '@anticrm/contact'
  import { Class,Doc,getCurrentAccount,Ref } from '@anticrm/core'
  import { Button,showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import calendar from '../plugin'
  import CreateReminder from './CreateReminder.svelte'

  export let attachedTo: Ref<Doc>
  export let attachedToClass: Ref<Class<Doc>>
  export let title: string | undefined

  function click (ev: Event): void {
    showPopup(CreateReminder, { attachedTo, attachedToClass, title }, ev.target as HTMLElement)
  }

  const currentUser = getCurrentAccount() as EmployeeAccount
</script>

<div class='antiPopup'>
  <Button label={calendar.string.CreateReminder} primary on:click={(e) => click(e)} />
  <div class="ap-space" />
  <Table
    _class={calendar.mixin.Reminder}
    config={['']}
    options={ {} }
    query={ { attachedTo, state: 'active', participants: currentUser.employee } }
    />
</div>

<style lang="scss">
  .antiPopup {
    padding: 1rem;
  }
</style>
