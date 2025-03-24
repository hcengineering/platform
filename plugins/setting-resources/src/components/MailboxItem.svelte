<!--
// Copyright © 2025 Anticrm Platform Contributors.
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
  import {
    ButtonIcon,
    DropdownIntlItem,
    Icon,
    IconDelete,
    IconMoreV,
    ModernPopup,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import { MailboxInfo } from '@hcengineering/account-client'
  import { MessageBox } from '@hcengineering/presentation'
  import { getAccountClient } from '../utils'

  export let mailbox: MailboxInfo
  export let mailboxIdx: number
  export let reloadRequested: () => void

  let opened = false

  function getMenuItems (mailbox: MailboxInfo): (DropdownIntlItem & { action: () => void })[] {
    return [
      {
        id: 'delete',
        icon: IconDelete,
        label: setting.string.DeleteMailbox,
        action: () => {
          deleteMailbox(mailbox)
        }
      }
    ]
  }

  function deleteMailbox (mailbox: MailboxInfo): void {
    showPopup(
      MessageBox,
      {
        labelStr: mailbox.mailbox,
        message: setting.string.MailboxDeleteConfirmation,
        dangerous: true,
        okLabel: setting.string.Delete,
        action: async () => {
          getAccountClient().deleteMailbox(mailbox.mailbox)
            .then(() => {
              reloadRequested()
            })
            .catch((err: any) => {
              console.error('Failed to delete mailbox', err)
            })
        }
      },
      undefined
    )
  }

  const openMailboxMenu = (mailbox: MailboxInfo, ev: MouseEvent): void => {
    if (!opened) {
      opened = true
      const items = getMenuItems(mailbox)
      showPopup(ModernPopup, { items }, eventToHTMLElement(ev), (result) => {
        items.find((it) => it.id === result)?.action()
        opened = false
      })
    }
  }
</script>

<div class="hulyTableAttr-container" class:mt-6={mailboxIdx > 0}>
  <div class="hulyTableAttr-header heading-medium-16" style="text-transform: unset">
    <Icon icon={setting.icon.Mailbox} size="small" />
    <span>{mailbox.mailbox}</span>
    <div class="buttons-group tertiary-textColor">
      <ButtonIcon
        kind="tertiary"
        icon={IconMoreV}
        size="small"
        pressed={opened}
        inheritColor
        hasMenu
        on:click={(ev) => {
          openMailboxMenu(mailbox, ev)
        }}
      />
    </div>
  </div>
</div>
