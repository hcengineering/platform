<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { Data, notEmpty, Ref } from '@hcengineering/core'
  import { Employee, formatName, getCurrentEmployee, getCurrentEmployeeSpace } from '@hcengineering/contact'
  import { Direct } from '@hcengineering/communication'
  import { employeeByIdStore } from '@hcengineering/contact-resources'

  export let collaborators: Ref<Employee>[] = []
  export let data: Partial<Data<Direct>>

  const dispatch = createEventDispatcher()

  $: updateData(collaborators)

  function updateData (collaborators: Ref<Employee>[]): void {
    const title = getTitle(collaborators)
    if (data.title === title) return

    dispatch('change', { data: { title, members: collaborators } })
  }

  function getTitle (ids: Ref<Employee>[]): string {
    const me = getCurrentEmployee()
    const employees = ids.map((id) => $employeeByIdStore.get(id)).filter(notEmpty)

    if (employees.length === 1) {
      return employees.map((e) => formatName(e.name)).join(', ')
    } else {
      return employees
        .filter((it) => it._id !== me)
        .map((e) => formatName(e.name))
        .join(', ')
    }
  }

  onMount(() => {
    const space = getCurrentEmployeeSpace()
    const members = collaborators
    const title = getTitle(collaborators)

    dispatch('change', { data: { members, title }, space })
  })
</script>
