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
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { EmployeeBox } from '@hcengineering/contact-resources'
  import { Button, createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import hr from '../plugin'

  export let space = hr.ids.Head

  const dispatch = createEventDispatcher()

  let name: string = ''
  let lead: Ref<Employee> | null = null

  export function canClose (): boolean {
    return name === ''
  }

  const client = getClient()

  async function createDepartment () {
    const id = await client.createDoc(hr.class.Department, space, {
      name,
      description: '',
      private: false,
      archived: false,
      members: [],
      teamLead: lead,
      managers: []
    })

    dispatch('close', id)
  }
  const manager = createFocusManager()
</script>

<FocusHandler {manager} />
<Card
  label={hr.string.CreateDepartment}
  okAction={createDepartment}
  canSave={!!name}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={hr.icon.Department} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <div class="clear-mins flex-grow">
      <EditBox
        focusIndex={2}
        bind:value={name}
        placeholder={hr.string.DepartmentPlaceholder}
        kind={'large-style'}
        autoFocus
      />
    </div>
  </div>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={hr.class.Department}
      label={hr.string.ParentDepartmentLabel}
      bind:space
      kind={'regular'}
      size={'large'}
    />
  </svelte:fragment>
  <svelte:fragment slot="pool">
    <EmployeeBox
      focusIndex={3}
      label={hr.string.TeamLead}
      placeholder={hr.string.TeamLead}
      kind={'regular'}
      size={'large'}
      bind:value={lead}
      allowDeselect
      showNavigate={false}
      titleDeselect={hr.string.UnAssignLead}
    />
  </svelte:fragment>
</Card>
