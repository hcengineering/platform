<script lang="ts">
  import contact, { Person, Employee } from '@hcengineering/contact'
  import { EmployeePresenter } from '@hcengineering/contact-resources'
  import { getClient } from '@hcengineering/presentation'
  import { getCurrentLocation, location, Location } from '@hcengineering/ui'
  import { decodeObjectURI } from '@hcengineering/view'
  import { Ref } from '@hcengineering/core'
  import { chunterId } from '@hcengineering/chunter'
  import { notificationId } from '@hcengineering/notification'

  import { createDirect } from '../utils'
  import { openChannel } from '../navigation'
  import chunter from '../plugin'

  export let person: Person | undefined

  function canNavigateToDirect (location: Location, person: Person | undefined): boolean {
    const app = location.path[2]
    if (app !== chunterId && app !== notificationId) {
      return false
    }

    if (person === undefined) {
      return false
    }

    return getClient().getHierarchy().hasMixin(person, contact.mixin.Employee) && (person as Employee).active
  }

  async function openEmployeeDirect (): Promise<void> {
    if (person === undefined) return

    const dm = await createDirect([person._id as Ref<Employee>])
    if (dm === undefined) {
      return
    }

    const loc = getCurrentLocation()
    const [_id] = decodeObjectURI(loc.path[3]) ?? []

    if (_id === dm) {
      return
    }

    openChannel(dm, chunter.class.DirectMessage, undefined, true)
  }
</script>

<EmployeePresenter
  value={person}
  shouldShowAvatar={false}
  compact
  onEmployeeEdit={canNavigateToDirect($location, person) ? openEmployeeDirect : undefined}
/>
