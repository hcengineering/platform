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
  import { personByPersonIdStore } from '@hcengineering/contact-resources'
  import { getCurrentAccount, Markup } from '@hcengineering/core'
  import { MessageViewer } from '@hcengineering/presentation'
  import { Action, IconEdit, IconDelete, ShowMore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import activity, { ActivityMessage, ActivityMessageViewType } from '@hcengineering/activity'
  import { ActivityMessageTemplate } from '@hcengineering/activity-resources'
  import { EmptyMarkup } from '@hcengineering/text'
  import { ReferenceInput } from '@hcengineering/text-editor-resources'

  export let value: any
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let showEmbedded = false
  export let hideFooter = false
  export let skipLabel = false
  export let actions: Action[] = []
  export let hoverable = true
  export let hoverStyles: 'borderedHover' | 'filledHover' | 'none' = 'borderedHover'
  export let withShowMore: boolean = true
  export let hideLink = false
  export let compact = false
  export let readonly = false
  export let type: ActivityMessageViewType = 'default'
  export let onClick: (() => void) | undefined = undefined
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined
  export let handleSubmit: ((text: string, _id: string) => void) | undefined = undefined

  const currentAccount = getCurrentAccount()

  $: account = value?.createdBy
  $: person = account !== undefined ? $personByPersonIdStore.get(account) : undefined

  let isEditing = false
  let additionalActions: Action[] = []

  $: isOwn = account !== undefined && account._id === currentAccount._id

  $: additionalActions = [
    ...(isOwn
      ? [
          {
            label: activity.string.Edit,
            icon: IconEdit,
            group: 'edit',
            action: handleEditAction
          },
          {
            label: view.string.Delete,
            icon: IconDelete,
            group: 'remove',
            action: handleDeleteAction
          }
        ]
      : []),
    ...actions
  ]

  let text: Markup = value?.message ?? EmptyMarkup
  $: if (!isEditing) text = value?.message ?? EmptyMarkup

  async function handleEditAction (): Promise<void> {
    isEditing = true
  }
  async function handleDeleteAction (): Promise<void> {
    if (value?._id) {
      handleSubmit?.('', value._id)
    }
  }

  async function handleSubmitEvent (event: CustomEvent<string>): Promise<void> {
    if (value?._id) {
      handleSubmit?.(event.detail, value._id)
    }
    isEditing = false
  }
</script>

{#if value}
  <ActivityMessageTemplate
    message={value}
    {person}
    {showNotify}
    {isHighlighted}
    {isSelected}
    {shouldScroll}
    {embedded}
    withActions={withActions && !isEditing}
    actions={additionalActions}
    {showEmbedded}
    {hideFooter}
    {hoverable}
    {hoverStyles}
    {skipLabel}
    {readonly}
    showDatePreposition={hideLink}
    embeddedActions={true}
    {type}
    {onClick}
    {onReply}
  >
    <svelte:fragment slot="content">
      {#if !isEditing}
        {#if withShowMore}
          <ShowMore limit={compact ? 80 : undefined}>
            <div class="clear-mins">
              <MessageViewer message={text} />
            </div>
          </ShowMore>
        {:else}
          <div class="clear-mins">
            <MessageViewer message={text} />
          </div>
        {/if}
      {:else}
        <ReferenceInput
          showCancel={true}
          content={text}
          autofocus={true}
          onCancel={() => {
            isEditing = false
          }}
          on:message={handleSubmitEvent}
        />
      {/if}
    </svelte:fragment>
  </ActivityMessageTemplate>
{/if}
