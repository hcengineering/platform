<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import {
    Avatar,
    SystemAvatar,
    employeeByIdStore,
    personAccountByIdStore,
    personByIdStore,
    EmployeePresenter
  } from '@hcengineering/contact-resources'
  import core, { Doc, getDisplayTime, Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient, MessageViewer } from '@hcengineering/presentation'
  import notification, { CommonInboxNotification } from '@hcengineering/notification'
  import { ActionIcon, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import { getDocLinkTitle, Menu } from '@hcengineering/view-resources'
  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import { ActivityDocLink, getLinkData, LinkData } from '@hcengineering/activity-resources'
  import activity from '@hcengineering/activity'
  import view from '@hcengineering/view'

  export let value: CommonInboxNotification

  const objectQuery = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const docNotifyContextsStore = inboxClient.docNotifyContexts

  let isActionMenuOpened = false
  let content = ''
  let object: Doc | undefined = undefined

  $: personAccount = $personAccountByIdStore.get((value.createdBy ?? value.modifiedBy) as Ref<PersonAccount>)
  $: person =
    personAccount?.person !== undefined
      ? $employeeByIdStore.get(personAccount.person as Ref<Employee>) ?? $personByIdStore.get(personAccount.person)
      : undefined

  $: context = $docNotifyContextsStore.find(({ _id }) => _id === value.docNotifyContext)

  $: context &&
    objectQuery.query(context.attachedToClass, { _id: context.attachedTo }, (result) => {
      object = result[0]
    })

  $: void translate(value.message, value.props)
    .then((message) => {
      content = message
    })
    .catch((err) => {
      content = JSON.stringify(err, null, 2)
    })

  function handleActionMenuOpened (): void {
    isActionMenuOpened = true
  }

  function handleActionMenuClosed (): void {
    isActionMenuOpened = false
  }

  function showMenu (ev: MouseEvent): void {
    showPopup(
      Menu,
      {
        object: value,
        baseMenuClass: notification.class.InboxNotification
      },
      ev.target as HTMLElement,
      handleActionMenuClosed
    )
    handleActionMenuOpened()
  }
</script>

<div class="root clear-mins">
  {#if !value.isViewed}
    <div class="notify" />
  {/if}
  {#if value.icon}
    <SystemAvatar size="medium" icon={value.icon} iconProps={value.iconProps} />
  {:else if person}
    <Avatar size="medium" avatar={person.avatar} name={person.name} />
  {:else}
    <SystemAvatar size="medium" />
  {/if}
  <div class="content ml-2 w-full clear-mins">
    <div class="header clear-mins">
      {#if person}
        <EmployeePresenter value={person} shouldShowAvatar={false} />
      {:else}
        <div class="strong">
          <Label label={core.string.System} />
        </div>
      {/if}
      {#if value.header}
        <span class="text-sm lower"><Label label={value.header} /></span>
      {/if}

      {#if object}
        {#await getDocLinkTitle(client, object._id, object._class, object) then linkTitle}
          <ActivityDocLink
            preposition={activity.string.In}
            {object}
            title={linkTitle}
            panelComponent={hierarchy.classHierarchyMixin(object._class, view.mixin.ObjectPanel)?.component}
          />
        {/await}
      {/if}

      <span class="text-sm">{getDisplayTime(value.createdOn ?? 0)}</span>
    </div>

    <div class="flex-row-center">
      <div class="customContent">
        <MessageViewer message={content} />
      </div>
    </div>
  </div>

  <div class="actions clear-mins flex flex-gap-2 items-center" class:opened={isActionMenuOpened}>
    <ActionIcon icon={IconMoreH} size="small" action={showMenu} />
  </div>
</div>

<style lang="scss">
  .root {
    position: relative;
    display: flex;
    flex-shrink: 0;
    padding: 0.75rem 0.75rem 0.75rem 1.25rem;
    border-radius: 8px;
    gap: 1rem;
    overflow: hidden;

    .actions {
      position: absolute;
      visibility: hidden;
      top: 0.75rem;
      right: 0.75rem;
      color: var(--theme-halfcontent-color);

      &.opened {
        visibility: visible;
      }
    }

    .content {
      padding: 0;
    }

    &:hover > .actions {
      visibility: visible;
    }

    &:hover {
      background-color: var(--highlight-hover);
    }
  }

  .header {
    display: flex;
    align-items: baseline;
    font-size: 0.875rem;
    color: var(--theme-halfcontent-color);
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: calc(100% - 3.5rem);

    span {
      margin-left: 0.25rem;
      font-weight: 400;
      line-height: 1.25rem;
    }
  }

  .notify {
    position: absolute;
    top: 0.5rem;
    left: 0.25rem;
    height: 0.5rem;
    width: 0.5rem;
    background-color: var(--theme-inbox-notify);
    border-radius: 50%;
  }
</style>
