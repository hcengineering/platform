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
  import contact, { Employee } from '@hcengineering/contact'
  import type { Class, DocumentQuery, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { showPopup } from '@hcengineering/ui'
  import type { IconSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { employeeByIdStore } from '../utils'
  import CombineAvatars from './CombineAvatars.svelte'
  import AddAvatar from './icons/AddAvatar.svelte'
  import UsersPopup from './UsersPopup.svelte'

  export let items: Ref<Employee>[] = []
  export let _class: Ref<Class<Employee>> = contact.mixin.Employee
  export let docQuery: DocumentQuery<Employee> | undefined = {
    active: true
  }

  export let label: IntlString | undefined = undefined
  export let size: IconSize = 'small'
  export let width: string | undefined = undefined
  export let readonly: boolean = false
  export let limit: number = 6
  export let hideLimit: boolean = false

  let persons: Employee[] = items.map((p) => $employeeByIdStore.get(p)).filter((p) => p !== undefined) as Employee[]
  $: persons = items.map((p) => $employeeByIdStore.get(p)).filter((p) => p !== undefined) as Employee[]

  const dispatch = createEventDispatcher()

  async function addPerson (evt: Event): Promise<void> {
    showPopup(
      UsersPopup,
      {
        _class,
        label,
        docQuery,
        multiSelect: true,
        allowDeselect: false,
        selectedUsers: items,
        readonly
      },
      evt.target as HTMLElement,
      undefined,
      (result) => {
        if (result != null) {
          items = result
          dispatch('update', items)
        }
      }
    )
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="flex-row-center flex-nowrap content-pointer-events-none"
  class:cursor-pointer={!readonly}
  style:width={width ?? 'auto'}
  on:click={readonly ? () => {} : addPerson}
>
  {#if persons.length > 0}
    <CombineAvatars {_class} bind:items {size} {limit} {hideLimit} />
  {:else}
    <AddAvatar {size} />
  {/if}
</div>
