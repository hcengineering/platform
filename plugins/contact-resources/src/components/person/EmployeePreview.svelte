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
  import { Employee } from '@hcengineering/contact'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { ModernButton, navigate, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { ComponentExtensions, getClient } from '@hcengineering/presentation'
  import ModernProfilePopup from './ModernProfilePopup.svelte'
  import AchievementsPresenter from './AchievementsPresenter.svelte'

  import contact from '../../plugin'
  import Avatar from '../Avatar.svelte'
  import { employeeByIdStore, statusByUserStore } from '../../utils'
  import { EmployeePresenter } from '../../index'

  export let employeeId: Ref<Employee>
  export let disabled: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let employee: Employee | undefined = undefined

  $: employee = $employeeByIdStore.get(employeeId)
  $: isOnline = employee?.personUuid !== undefined && $statusByUserStore.get(employee.personUuid)?.online === true

  async function viewProfile (): Promise<void> {
    if (employee === undefined) return
    const panelComponent = hierarchy.classHierarchyMixin(employee._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(hierarchy, employee, {}, comp)
    navigate(loc)
  }
</script>

<ModernProfilePopup {disabled}>
  <div slot="content">
    <div class="flex-presenter flex-gap-2 p-2">
      <Avatar size="large" person={employee} name={employee.name} {disabled} />
      <span class="username">
        <EmployeePresenter value={employee} shouldShowAvatar={false} showPopup={false} compact />
      </span>
      <span class="hulyAvatar-statusMarker small relative mt-0-5" class:online={isOnline} class:offline={!isOnline} />
    </div>
    <AchievementsPresenter personId={employeeId}/>
  </div>
  <div slot="actions">
    <div class="flex-presenter flex-gap-2 flex-center">
      <ComponentExtensions extension={contact.extension.EmployeePopupActions} props={{ employee, width: '160px', kind: 'ghost' }} />
      <ModernButton
        label={contact.string.ViewProfile}
        icon={contact.icon.Person}
        size="small"
        kind="ghost"
        iconSize="small"
        width="160px"
        on:click={viewProfile}
      />
    </div>
  </div>
</ModernProfilePopup>

<style lang="scss">
  .username {
    font-weight: 500;
  }
</style>
