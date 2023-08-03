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
  import { PersonAccount } from '@hcengineering/contact'
  import { Doc, getCurrentAccount } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, showPopup } from '@hcengineering/ui'
  import calendar from '../plugin'
  import CreateReminder from './CreateReminder.svelte'
  import DocRemindersPopup from './DocRemindersPopup.svelte'
  import SaveEventReminder from './SaveEventReminder.svelte'

  export let value: Doc
  export let title: string | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: isEvent = hierarchy.isDerived(value._class, calendar.class.Event)

  async function click (ev: Event): Promise<void> {
    if (isEvent) {
      showPopup(SaveEventReminder, { objectId: value._id, objectClass: value._class }, ev.target as HTMLElement)
    } else {
      const currentUser = getCurrentAccount() as PersonAccount
      const current = await client.findOne(calendar.class.Event, {
        attachedTo: value._id,
        participants: currentUser.person
      })
      if (current === undefined) {
        showPopup(
          CreateReminder,
          { attachedTo: value._id, attachedToClass: value._class, title },
          ev.target as HTMLElement
        )
      } else {
        showPopup(
          DocRemindersPopup,
          { attachedTo: value._id, attachedToClass: value._class, title },
          ev.target as HTMLElement
        )
      }
    }
  }
</script>

<Button
  size={'medium'}
  kind={'ghost'}
  icon={calendar.icon.Reminder}
  showTooltip={{ label: isEvent ? calendar.string.RemindMeAt : calendar.string.Reminders }}
  on:click={(e) => click(e)}
/>
