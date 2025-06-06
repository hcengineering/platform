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
  import { Ref } from '@hcengineering/core'
  import { DatePresenter, Label, tooltip } from '@hcengineering/ui'
  import { Employee } from '@hcengineering/contact'
  import { EmployeeBox } from '@hcengineering/contact-resources'

  import testManagement from '@hcengineering/test-management'

  export let defaultAssignee: Ref<Employee> | undefined = undefined
  export let dueDate: number | undefined = undefined
</script>

<div class="space-divider" />
<div class="popupPanel-body__aside-grid" style:margin-top="0">
  <span
    class="labelOnPanel"
    use:tooltip={{
      component: Label,
      props: { label: testManagement.string.DefaultAssignee }
    }}
  >
    <Label label={testManagement.string.DefaultAssignee} />
  </span>
  <div class="flex flex-grow min-w-0">
    <EmployeeBox
      bind:value={defaultAssignee}
      label={testManagement.string.Unassigned}
      kind={'link'}
      size={'medium'}
      avatarSize={'card'}
      width={'100%'}
      showNavigate={false}
    />
  </div>
  <span
    class="labelOnPanel"
    use:tooltip={{
      component: Label,
      props: { label: testManagement.string.DueDate }
    }}
  >
    <Label label={testManagement.string.DueDate} />
  </span>
  <div class="flex flex-grow min-w-0">
    <DatePresenter
      focusIndex={10}
      bind:value={dueDate}
      labelNull={testManagement.string.DueDate}
      kind={'link'}
      size={'large'}
      editable
    />
  </div>
</div>
