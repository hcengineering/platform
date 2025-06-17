<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Employee, Person } from '@hcengineering/contact'
  import { AccountUuid, Class, Doc, Ref } from '@hcengineering/core'
  import { ButtonIcon, navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { ComponentExtensions, getClient } from '@hcengineering/presentation'

  import ModernProfilePopup from './ModernProfilePopup.svelte'
  import contact from '../../plugin'
  import Avatar from '../Avatar.svelte'
  import { employeeByIdStore } from '../../utils'
  import { getPersonTimezone } from './utils'
  import { EmployeePresenter, getPersonByPersonRefStore } from '../../index'
  import TimePresenter from './TimePresenter.svelte'
  import DeactivatedHeader from './DeactivatedHeader.svelte'

  export let _id: Ref<Employee>
  export let disabled: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let employee: Employee | Person | undefined = undefined
  let timezone: string | undefined = undefined
  let isEmployee: boolean = false

  $: personByRefStore = getPersonByPersonRefStore([_id])
  $: employee = $employeeByIdStore.get(_id) ?? $personByRefStore.get(_id)
  $: isEmployee = $employeeByIdStore.has(_id)
  $: void loadPersonTimezone(employee)

  async function viewProfile (): Promise<void> {
    if (employee === undefined) return
    const panelComponent = hierarchy.classHierarchyMixin(employee._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(hierarchy, employee, {}, comp)
    navigate(loc)
  }

  async function loadPersonTimezone (person: Employee | Person | undefined): Promise<void> {
    if (person?.personUuid !== undefined && isEmployee) {
      timezone = await getPersonTimezone(person?.personUuid as AccountUuid)
    }
  }
</script>

<ModernProfilePopup {disabled}>
  <div slot="header">
    {#if disabled}
      <div class="flex-presenter">
        <DeactivatedHeader>
          <div slot="actions">
            <div class="flex-presenter flex-gap-2 flex-center">
              <ComponentExtensions
                extension={contact.extension.EmployeePopupActions}
                props={{ employee, icon: contact.icon.Chat, type: 'type-button-icon' }}
              />
              <ButtonIcon icon={contact.icon.User} size="small" iconSize="small" on:click={viewProfile} />
            </div>
          </div>
        </DeactivatedHeader>
      </div>
    {/if}
  </div>
  <div slot="content">
    {#if !disabled}
      <div class="flex-presenter cursor-default flex-gap-2 p-3">
        <Avatar
          size="large"
          person={employee}
          name={employee?.name}
          {disabled}
          showStatus={isEmployee}
          statusSize="medium"
          style="modern"
          clickable
          on:click={viewProfile}
        />
        <div class="flex-col flex-gap-0-5 pl-1">
          <div class="status-container" />
          <EmployeePresenter value={employee} shouldShowAvatar={false} showPopup={false} compact accent />
          <span class="flex-presenter cursor-default">
            <TimePresenter {timezone} />
          </span>
        </div>
      </div>
      <!-- Hide achievements for now, as achievmment service is not yet implemented
      {#if isEmployee}
        <div class="py-1">
          <ComponentExtensions
            extension={contact.extension.PersonAchievementsPresenter}
            props={{
              personId: _id
            }}
          />
        </div>
      {/if}
      -->
    {:else}
      <div class="flex-presenter flex-gap-2 p-2">
        <div class="flex-presenter">
          <Avatar
            size="large"
            person={employee}
            name={employee?.name}
            {disabled}
            style="modern"
            clickable
            on:click={viewProfile}
          />
        </div>
        <div class="flex-col">
          <EmployeePresenter value={employee} shouldShowAvatar={false} showPopup={false} compact accent />
        </div>
      </div>
    {/if}
  </div>
  <div slot="actions">
    {#if !disabled}
      <div class="flex-presenter flex-gap-2 flex-center">
        <div class="button-container">
          <ComponentExtensions
            extension={contact.extension.EmployeePopupActions}
            props={{ employee, icon: contact.icon.Chat, type: 'type-button-icon' }}
          />
        </div>
        <div class="button-container">
          <ButtonIcon icon={contact.icon.User} size="small" iconSize="small" on:click={viewProfile} />
        </div>
      </div>
    {/if}
  </div>
</ModernProfilePopup>

<style lang="scss">
  .button-container {
    border-radius: var(--small-BorderRadius);
    display: flex;
    background-color: var(--theme-button-container-color);
  }
  .status-container {
    display: flex;
    min-height: 1rem;
  }
</style>
