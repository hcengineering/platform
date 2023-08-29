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
  import type { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import type { ButtonKind, ButtonSize, TooltipAlignment } from '@hcengineering/ui'
  import { Button, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'
  import { employeeByIdStore } from '../utils'
  import CombineAvatars from './CombineAvatars.svelte'
  import UserInfo from './UserInfo.svelte'
  import UsersPopup from './UsersPopup.svelte'
  import Members from './icons/Members.svelte'

  export let items: Ref<Employee>[] = []
  export let _class: Ref<Class<Employee>> = contact.mixin.Employee
  export let docQuery: DocumentQuery<Employee> | undefined = {}

  export let label: IntlString | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let emptyLabel = plugin.string.Members
  export let readonly: boolean = false

  function filter (items: Ref<Employee>[]): Ref<Employee>[] {
    return items.filter((it, idx, arr) => arr.indexOf(it) === idx)
  }

  let persons: Employee[] = filter(items)
    .map((p) => $employeeByIdStore.get(p))
    .filter((p) => p !== undefined) as Employee[]
  $: persons = filter(items)
    .map((p) => $employeeByIdStore.get(p))
    .filter((p) => p !== undefined) as Employee[]

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function addPerson (evt: Event): Promise<void> {
    showPopup(
      UsersPopup,
      {
        _class,
        label,
        docQuery,
        multiSelect: true,
        allowDeselect: false,
        selectedUsers: filter(items),
        filter: (it: Doc) => {
          const h = client.getHierarchy()
          if (h.hasMixin(it, contact.mixin.Employee)) {
            return h.as(it, contact.mixin.Employee).active
          }
        },
        readonly
      },
      evt.target as HTMLElement,
      undefined,
      (result) => {
        if (result != null) {
          items = filter(result)
          dispatch('update', items)
        }
      }
    )
  }
</script>

<Button
  icon={persons.length === 0 ? Members : undefined}
  label={persons.length === 0 ? emptyLabel : undefined}
  notSelected={persons.length === 0}
  width={width ?? 'min-content'}
  {kind}
  {size}
  {justify}
  showTooltip={label ? { label, direction: labelDirection } : undefined}
  on:click={addPerson}
>
  <svelte:fragment slot="content">
    {#if persons.length > 0}
      <div class="flex-row-center flex-nowrap pointer-events-none">
        {#if persons.length === 1}
          <UserInfo value={persons[0]} size={'card'} />
        {:else}
          <CombineAvatars {_class} bind:items size={'card'} hideLimit />
          <span class="overflow-label ml-1-5">
            <Label label={plugin.string.NumberMembers} params={{ count: persons.length }} />
          </span>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Button>
