<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { ModernButton, navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { ComponentExtensions, getClient } from '@hcengineering/presentation'
  import ModernProfilePopup from './person/ModernProfilePopup.svelte'

  import contact from '../plugin'
  import Avatar from './Avatar.svelte'
  import { employeeByIdStore, statusByUserStore } from '../utils'
  import { EmployeePresenter } from '../index'

  export let employeeId: Ref<Employee>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let employee: Employee | undefined = undefined

  $: employee = $employeeByIdStore.get(employeeId)
  $: isOnline = employee?.personUuid !== undefined && $statusByUserStore.get(employee.personUuid)?.online === true

  // const statusesQuery = createQuery()
  // let editable = false
  // let status: Status | undefined = undefined
  // $: editable = employeeId === me
  // statusesQuery.query(contact.class.Status, { attachedTo: employeeId }, (res) => {
  //   status = res[0]
  // })

  // function setStatus (): void {
  //   if (!employee) return
  //   showPopup(
  //     EmployeeSetStatusPopup,
  //     {
  //       currentStatus: status
  //     },
  //     undefined,
  //     () => {},
  //     async (newStatus: Status) => {
  //       if (status && newStatus) {
  //         await client.updateDoc(contact.class.Status, status.space, status._id, { ...newStatus })
  //       } else if (status && !newStatus) {
  //         await client.removeDoc(contact.class.Status, status.space, status._id)
  //       } else {
  //         await client.addCollection(contact.class.Status, employee.space, employeeId, contact.mixin.Employee, 'statuses', {
  //           name: newStatus.name,
  //           dueDate: newStatus.dueDate
  //         })
  //       }
  //     }
  //   )
  //   dispatch('close')
  // }

  async function viewProfile (): Promise<void> {
    if (employee === undefined) return
    const panelComponent = hierarchy.classHierarchyMixin(employee._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(hierarchy, employee, {}, comp)
    navigate(loc)
  }
</script>

<ModernProfilePopup>
  <div slot="content">
    <Avatar size="large" person={employee} name={employee.name} />
    <span class="username">
      <EmployeePresenter value={employee} shouldShowAvatar={false} showPopup={false} compact />
    </span>
    <span class="hulyAvatar-statusMarker small relative mt-0-5" class:online={isOnline} class:offline={!isOnline} />
  </div>
  <div slot="actions">
    <ComponentExtensions extension={contact.extension.EmployeePopupActions} props={{ employee }} />
    <ModernButton
      label={contact.string.ViewProfile}
      icon={contact.icon.Person}
      size="small"
      iconSize="small"
      on:click={viewProfile}
    />
  </div>
</ModernProfilePopup>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    width: auto;
    min-height: 0;
    min-width: 0;
    max-width: 30rem;
    background: var(--theme-popup-color);
    user-select: none;
  }

  .separator {
    height: 1px;
    width: 100%;
    background: var(--global-ui-BorderColor);
  }

  .username {
    font-weight: 500;
  }

  //.statusContainer {
  //  .setStatusButton {
  //    opacity: 0;
  //  }
  //
  //  &:hover .setStatusButton {
  //    opacity: 1;
  //  }
  //}
</style>
