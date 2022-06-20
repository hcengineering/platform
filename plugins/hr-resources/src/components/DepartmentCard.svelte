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
  import { Ref, WithLookup } from '@anticrm/core'
  import { Department } from '@anticrm/hr'
  import { Avatar, getClient, UsersPopup } from '@anticrm/presentation'
  import CreateDepartment from './CreateDepartment.svelte'
  import DepartmentCard from './DepartmentCard.svelte'
  import hr from '../plugin'
  import { IconAdd, IconMoreV, Button, eventToHTMLElement, Label, showPopup, ActionIcon } from '@anticrm/ui'
  import contact, { Employee } from '@anticrm/contact'
  import { EmployeePresenter } from '@anticrm/contact-resources'
  import DepartmentStaff from './DepartmentStaff.svelte'
  import { Menu } from '@anticrm/view-resources'

  export let value: WithLookup<Department>
  export let descendants: Map<Ref<Department>, WithLookup<Department>[]>

  $: currentDescendants = descendants.get(value._id) ?? []
  let expand = false

  const client = getClient()

  function toggle () {
    if (currentDescendants.length === 0) return
    expand = !expand
  }

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
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        selected: value.$lookup?.teamLead,
        allowDeselect: true,
        placeholder: hr.string.TeamLead
      },
      eventToHTMLElement(event),
      changeLead
    )
  }

  function createChild (e: MouseEvent) {
    showPopup(CreateDepartment, { space: value._id }, eventToHTMLElement(e), (res) => {
      if (res && !expand) expand = true
    })
  }

  function editMembers (e: MouseEvent) {
    showPopup(DepartmentStaff, { _id: value._id }, 'float')
  }

  function showMenu (e: MouseEvent) {
    showPopup(
      Menu,
      { object: value, baseMenuClass: value._class },
      {
        getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: e.clientX, y: e.clientY })
      }
    )
  }
</script>

<div class="flex-center w-full px-4">
  <div
    class="w-full mt-2 mb-2 container flex"
    class:cursor-pointer={currentDescendants.length}
    on:click|stopPropagation={toggle}
    on:contextmenu|preventDefault={showMenu}
  >
    {#if currentDescendants.length}
      <div class="verticalDivider" />
      <div class="verticalDivider" />
    {/if}
    <div class="flex-between pt-4 pb-4 pr-4 pl-2 w-full">
      <div class="flex-center">
        <Avatar size={'medium'} avatar={value.avatar} icon={hr.icon.Department} />
        <div class="flex-row ml-2">
          <div class="fs-title">
            {value.name}
          </div>
          <div class="cursor-pointer" on:click|stopPropagation={editMembers}>
            <Label label={hr.string.MemberCount} params={{ count: value.members.length }} />
          </div>
        </div>
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
        <Button icon={IconAdd} on:click={createChild} />
        <ActionIcon icon={IconMoreV} size={'medium'} action={showMenu} />
      </div>
    </div>
  </div>
</div>
{#if expand && currentDescendants.length}
  <div class="ml-8">
    {#each descendants.get(value._id) ?? [] as nested}
      <DepartmentCard value={nested} {descendants} />
    {/each}
  </div>
{/if}

<style lang="scss">
  .container {
    border-radius: 0.5rem;
    border: 1px solid var(--theme-zone-border);
    background-color: var(--board-card-bg-color);
  }

  .verticalDivider {
    width: 1px;
    margin-left: 0.125rem;
    background-color: var(--theme-zone-border);
  }
</style>
