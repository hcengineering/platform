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
  import { getClient, MessageBox } from '@hcengineering/presentation'
  import { getAccountClient } from '../utils'
  import contact, { getCurrentEmployee } from '@hcengineering/contact'
  import { buildSocialIdString, SocialIdType } from '@hcengineering/core'

  export let mailbox: MailboxInfo
  export let mailboxIdx: number
  export let loadingRequested: () => void
  export let reloadRequested: () => void

  let opened = false

  function deleteMailboxAction (): void {
    showPopup(
      MessageBox,
      {
        labelStr: mailbox.mailbox,
        message: setting.string.MailboxDeleteConfirmation,
        dangerous: true,
        okLabel: setting.string.Delete,
        action: async () => {
          loadingRequested()
          try {
            await deleteMailbox()
          } catch (err) {
            console.error('Failed to delete mailbox', err)
          }
          reloadRequested()
        }
      },
      undefined
    )
  }

  async function deleteMailbox (): Promise<void> {
    await getAccountClient().deleteMailbox(mailbox.mailbox)
    const client = getClient()
    const currentUser = getCurrentEmployee()
    const socialIds = await client.findAll(contact.class.SocialIdentity, {
      attachedTo: currentUser,
      type: SocialIdType.EMAIL,
      value: mailbox.mailbox
    })
    for (const socialId of socialIds) {
      const value = `${socialId.value}#${socialId._id}`
      await client.updateCollection(
        socialId._class,
        socialId.space,
        socialId._id,
        socialId.attachedTo,
        socialId.attachedToClass,
        socialId.collection,
        {
          value,
          key: buildSocialIdString({ type: SocialIdType.EMAIL, value })
        }
      )
    }
    const channels = await client.findAll(contact.class.Channel, {
      attachedTo: currentUser,
      provider: contact.channelProvider.Email,
      value: mailbox.mailbox
    })
    for (const channel of channels) {
      await client.removeCollection(
        channel._class,
        channel.space,
        channel._id,
        channel.attachedTo,
        channel.attachedToClass,
        channel.collection
      )
    }
  }

  const openMailboxMenu = (ev: MouseEvent): void => {
    if (!opened) {
      opened = true
      const items: (DropdownIntlItem & { action: () => void })[] = [
        {
          id: 'delete',
          icon: IconDelete,
          label: setting.string.DeleteMailbox,
          action: deleteMailboxAction
        }
      ]
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
    <span style="user-select: text">{mailbox.mailbox}</span>
    <div class="buttons-group tertiary-textColor">
      <ButtonIcon
        kind="tertiary"
        icon={IconMoreV}
        size="small"
        pressed={opened}
        inheritColor
        hasMenu
        on:click={openMailboxMenu}
      />
    </div>
  </div>
  <!-- TODO
  <div class="hulyTableAttr-content withTitle">
    <div class="flex-col column">
      <div class="hulyTableAttr-content__title">
        <span class="pl-2">
          Aliases
        </span>
      </div>
      <div class="hulyTableAttr-content__wrapper flex-gap-1">
        {#each mailbox.aliases ?? [] as alias}
          <NavItem
            title={alias}
            icon={setting.icon.InviteSettings}
            type="type-link"
          >
            <svelte:fragment slot="actions">
              <ButtonIcon
                icon={IconDelete}
                size="extra-small"
                kind="tertiary"
                tooltip={{ label: setting.string.Delete, direction: 'top' }}
                on:click={() => {
                  deleteAlias(alias)
                }}
              />
            </svelte:fragment>
          </NavItem>
        {/each}
        <NavItem
          title="Create alias"
          icon={IconAdd}
          type="type-link"
          on:click={createAlias}
        />
      </div>
    </div>
    <div class="flex-col column">
      <div class="hulyTableAttr-content__title">
        <span class="pl-2">
          App passwords
        </span>
      </div>
      <div class="hulyTableAttr-content__wrapper flex-gap-1">
        {#each mailbox.appPasswords ?? [] as app}
          <NavItem
            title={app}
            icon={setting.icon.Password}
            type="type-link"
          >
            <svelte:fragment slot="actions">
              <ButtonIcon
                icon={IconDelete}
                size="extra-small"
                kind="tertiary"
                tooltip={{ label: setting.string.Delete, direction: 'top' }}
                on:click={() => {
                  deletePassword(app)
                }}
              />
            </svelte:fragment>
          </NavItem>
        {/each}
        <NavItem
          title="Add password"
          icon={IconAdd}
          type="type-link"
          on:click={createPassword}
        />
      </div>
    </div>
  </div>
  -->
</div>

<!-- TODO
<style lang="scss">
  .column {
    flex: 1;
    padding-bottom: 0.75rem;

    &:first-child {
      border-right: 1px solid var(--theme-divider-color);
    }
  }
</style>
-->
