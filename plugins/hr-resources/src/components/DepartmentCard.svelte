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
  import { Avatar, EmployeePresenter, UsersPopup } from '@hcengineering/contact-resources'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { Department, Staff } from '@hcengineering/hr'
  import { getClient } from '@hcengineering/presentation'
  import {
    Button,
    IconAdd,
    Label,
    closeTooltip,
    eventToHTMLElement,
    getEventPositionElement,
    showPopup
  } from '@hcengineering/ui'
  import { Menu, openDoc } from '@hcengineering/view-resources'
  import hr from '../plugin'
  import { addMember } from '../utils'
  import CreateDepartment from './CreateDepartment.svelte'
  import DepartmentCard from './DepartmentCard.svelte'
  import PersonsPresenter from './PersonsPresenter.svelte'

  export let value: WithLookup<Department>
  export let descendants: Map<Ref<Department>, WithLookup<Department>[]>
  export let allEmployees: WithLookup<Staff>[] = []

  $: currentDescendants = descendants.get(value._id) ?? []

  const client = getClient()

  async function changeLead (result: Employee | null | undefined): Promise<void> {
    if (result === undefined) {
      return
    }

    const newLead = result === null ? null : result._id
    if (newLead !== value.teamLead) {
      await client.update(value, { teamLead: newLead })
    }
  }

  function openLeadEditor (event: MouseEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    showPopup(
      UsersPopup,
      {
        _class: contact.mixin.Employee,
        selected: value.$lookup?.teamLead,
        allowDeselect: true,
        placeholder: hr.string.TeamLead,
        docQuery: {
          active: true
        }
      },
      eventToHTMLElement(event),
      changeLead
    )
  }

  function createChild (e: MouseEvent) {
    showPopup(CreateDepartment, { space: value._id }, eventToHTMLElement(e))
  }

  function showMenu (e: MouseEvent) {
    showPopup(Menu, { object: value, baseMenuClass: value._class }, getEventPositionElement(e))
  }

  function edit (e: MouseEvent): void {
    openDoc(client.getHierarchy(), value)
  }

  export let dragPerson: WithLookup<Staff> | undefined
  export let dragOver: Department | undefined

  $: dragPersonId = dragPerson?._id

  $: values = allEmployees.filter((it) => it.department === value._id && it._id !== dragPersonId)

  $: dragging = value._id === dragOver?._id && dragPersonId !== undefined
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="w-full mt-2 mb-4 container flex clear-mins flex-no-shrink"
  class:cursor-pointer={currentDescendants.length}
  on:click|stopPropagation={edit}
  on:contextmenu|preventDefault={showMenu}
  class:dragging
>
  <div
    class="flex-between pt-4 pb-4 pr-4 pl-2 w-full"
    on:dragover|preventDefault|stopPropagation={(evt) => {
      dragOver = value
    }}
    on:dragend|preventDefault|stopPropagation={() => {
      dragPerson = undefined
      closeTooltip()
    }}
    on:drop|preventDefault={(itm) => {
      closeTooltip()
      addMember(client, dragPerson, value).then(() => {
        dragPerson = undefined
        dragOver = undefined
      })
    }}
  >
    <div class="flex-center">
      <div class="mr-2">
        <Button icon={IconAdd} kind={'list'} on:click={createChild} />
      </div>
      <Avatar size={'medium'} avatar={value.avatar} icon={hr.icon.Department} name={value.name} />
      <div class="flex-row ml-2 mr-4">
        <div class="fs-title">
          {value.name}
        </div>
        <Label label={hr.string.MemberCount} params={{ count: value.members.length }} />
      </div>
      <PersonsPresenter value={values} bind:dragPerson showDragPerson={dragging} />
    </div>
    <div class="flex-center mr-2">
      <div class="mr-2">
        <EmployeePresenter
          value={value.$lookup?.teamLead}
          avatarSize={'small'}
          shouldShowAvatar
          shouldShowPlaceholder
          shouldShowName={false}
          tooltipLabels={{
            personLabel: hr.string.TeamLeadTooltip,
            placeholderLabel: hr.string.AssignLead
          }}
          onEmployeeEdit={openLeadEditor}
        />
      </div>
    </div>
  </div>
</div>
{#if currentDescendants.length > 0}
  <div class="flex-col ml-8 clear-mins flex-no-shrink">
    {#each currentDescendants as nested}
      <DepartmentCard value={nested} {descendants} {allEmployees} bind:dragPerson bind:dragOver />
    {/each}
  </div>
{/if}

<style lang="scss">
  .container {
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;

    &:hover {
      background-color: var(--theme-button-hovered);
      cursor: pointer;
    }
    &.dragging {
      border-color: var(--accented-button-outline);
    }
  }
</style>
