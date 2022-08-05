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
  import contact, { Employee } from '@anticrm/contact'
  import { EmployeePresenter } from '@anticrm/contact-resources'
  import { Ref, WithLookup } from '@anticrm/core'
  import { Department, Staff } from '@anticrm/hr'
  import { Avatar, getClient, UsersPopup } from '@anticrm/presentation'
  import {
    Button,
    closeTooltip,
    eventToHTMLElement,
    getEventPositionElement,
    IconAdd,
    Label,
    showPanel,
    showPopup
  } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { Menu } from '@anticrm/view-resources'
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
        _class: contact.class.Employee,
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
    showPanel(view.component.EditDoc, value._id, value._class, 'content')
  }

  export let dragPerson: WithLookup<Staff> | undefined
  export let dragOver: Department | undefined

  $: dragPersonId = dragPerson?._id

  $: values = allEmployees.filter((it) => it.department === value._id && it._id !== dragPersonId)

  $: dragging = value._id === dragOver?._id && dragPersonId !== undefined
</script>

<div class="flex-center w-full px-4">
  <div
    class="w-full mt-2 mb-2 container flex"
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
          <Button icon={IconAdd} kind={'link-bordered'} on:click={createChild} />
        </div>
        <Avatar size={'medium'} avatar={value.avatar} icon={hr.icon.Department} />
        <div class="flex-row ml-2">
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
</div>
<div class="ml-8">
  {#each currentDescendants as nested}
    <DepartmentCard value={nested} {descendants} {allEmployees} bind:dragPerson bind:dragOver />
  {/each}
</div>

<style lang="scss">
  .container {
    background-color: var(--board-card-bg-color);
    border: 1px solid transparent;

    &:hover {
      background-color: var(--board-card-bg-hover);
      cursor: pointer;
    }
    &.dragging {
      border: 1px solid var(--theme-bg-focused-color);
    }
  }
</style>
