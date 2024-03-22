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
  import { Doc } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import notification, { CommonInboxNotification } from '@hcengineering/notification'
  import { IconMoreV, showPopup } from '@hcengineering/ui'
  import { Menu } from '@hcengineering/view-resources'
  import { ActivityMessageAction, BasePreview } from '@hcengineering/activity-resources'

  export let value: CommonInboxNotification

  const client = getClient()

  let previewElement: BasePreview
  let content = ''

  $: void updateContent(value.message, value.messageHtml)

  async function updateContent (message?: IntlString, messageHtml?: string): Promise<void> {
    if (messageHtml !== undefined) {
      content = messageHtml
    } else if (message !== undefined) {
      content = await translate(message, value.props)
    }
  }

  function showMenu (ev: MouseEvent): void {
    ev.stopPropagation()
    ev.preventDefault()

    showPopup(
      Menu,
      {
        object: value,
        baseMenuClass: notification.class.InboxNotification
      },
      ev.target as HTMLElement,
      previewElement.onActionsClosed
    )
    previewElement.onActionsOpened()
  }

  let headerObject: Doc | undefined = undefined

  $: value.headerObjectId &&
    value.headerObjectClass &&
    client.findOne(value.headerObjectClass, { _id: value.headerObjectId }).then((doc) => {
      headerObject = doc
    })
</script>

<BasePreview
  bind:this={previewElement}
  headerIcon={value.headerIcon}
  header={value.header}
  {headerObject}
  text={content}
  account={value.createdBy ?? value.modifiedBy}
  timestamp={value.createdOn ?? value.modifiedOn}
  on:click
>
  <svelte:fragment slot="actions">
    <div class="actionsContainer">
      <ActivityMessageAction icon={IconMoreV} action={showMenu} />
    </div>
  </svelte:fragment>
</BasePreview>

<style lang="scss">
  .actionsContainer {
    display: flex;
    align-items: center;
    border-radius: 0.375rem;
    border: 1px solid var(--global-subtle-ui-BorderColor);
    padding: 0.125rem;
    background: var(--global-surface-01-BackgroundColor);
    box-shadow: 0.5rem 0.75rem 1rem 0.25rem var(--global-popover-ShadowColor);
    height: fit-content;
  }
</style>
