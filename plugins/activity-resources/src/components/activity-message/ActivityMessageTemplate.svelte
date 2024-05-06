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
  import activity, { ActivityMessageViewlet, DisplayActivityMessage } from '@hcengineering/activity'
  import { Person } from '@hcengineering/contact'
  import { Avatar, EmployeePresenter, SystemAvatar } from '@hcengineering/contact-resources'
  import core from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Action, Icon, Label } from '@hcengineering/ui'
  import { getActions, restrictionStore, showMenu } from '@hcengineering/view-resources'

  import ReactionsPresenter from '../reactions/ReactionsPresenter.svelte'
  import ActivityMessagePresenter from './ActivityMessagePresenter.svelte'
  import ActivityMessageActions from '../ActivityMessageActions.svelte'
  import { isReactionMessage } from '../../activityMessagesUtils'
  import { savedMessagesStore } from '../../activity'
  import MessageTimestamp from '../MessageTimestamp.svelte'
  import Replies from '../Replies.svelte'

  export let message: DisplayActivityMessage
  export let parentMessage: DisplayActivityMessage | undefined = undefined

  export let viewlet: ActivityMessageViewlet | undefined = undefined
  export let person: Person | undefined = undefined
  export let actions: Action[] = []
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let showEmbedded = false
  export let hideFooter = false
  export let skipLabel = false
  export let hoverable = true
  export let hoverStyles: 'borderedHover' | 'filledHover' = 'borderedHover'
  export let showDatePreposition = false
  export let onClick: (() => void) | undefined = undefined

  const client = getClient()

  let menuActionIds: string[] = []

  let element: HTMLDivElement | undefined = undefined
  let isActionsOpened = false

  let isSaved = false

  savedMessagesStore.subscribe((saved) => {
    isSaved = saved.some((savedMessage) => savedMessage.attachedTo === message._id)
  })

  $: withActions &&
    getActions(client, message, activity.class.ActivityMessage).then((res) => {
      menuActionIds = res.map(({ _id }) => _id)
    })

  function scrollToMessage (): void {
    if (element != null && shouldScroll) {
      element.scrollIntoView({ behavior: 'auto', block: 'end' })
      shouldScroll = false
    }
  }

  $: if (element != null && shouldScroll) {
    setTimeout(scrollToMessage, 100)
  }

  function handleActionsOpened (): void {
    isActionsOpened = true
  }

  function handleActionsClosed (): void {
    isActionsOpened = false
  }

  $: key = parentMessage != null ? `${message._id}_${parentMessage._id}` : message._id

  $: isHidden = !!viewlet?.onlyWithParent && parentMessage === undefined
  $: withActionMenu = withActions && !embedded && (actions.length > 0 || menuActionIds.length > 0)

  let readonly: boolean = false
  $: readonly = $restrictionStore.disableComments
</script>

{#if !isHidden}
  {#key key}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      bind:this={element}
      id={message._id}
      class="activityMessage clear-mins"
      class:clickable={!!onClick}
      class:highlighted={isHighlighted}
      class:selected={isSelected}
      class:hoverable
      class:embedded
      class:actionsOpened={isActionsOpened}
      class:borderedHover={hoverStyles === 'borderedHover'}
      class:filledHover={hoverStyles === 'filledHover'}
      on:click={onClick}
      on:contextmenu={(evt) => {
        showMenu(evt, { object: message, baseMenuClass: activity.class.ActivityMessage }, () => {
          isActionsOpened = false
        })
        isActionsOpened = true
      }}
    >
      {#if showNotify && !embedded}
        <div class="notify" />
      {/if}
      {#if !embedded}
        <div class="min-w-6 mt-1 relative">
          {#if $$slots.icon}
            <slot name="icon" />
          {:else if person}
            <Avatar size="medium" avatar={person.avatar} name={person.name} />
          {:else}
            <SystemAvatar size="medium" />
          {/if}
          {#if isSaved}
            <div class="saveMarker">
              <Icon icon={activity.icon.BookmarkFilled} size="xx-small" />
            </div>
          {/if}
        </div>
      {:else}
        <div class="embeddedMarker" />
      {/if}
      <div class="flex-col ml-2 w-full clear-mins message-content">
        <div class="header clear-mins">
          {#if person}
            <EmployeePresenter value={person} shouldShowAvatar={false} compact />
          {:else}
            <div class="strong">
              <Label label={core.string.System} />
            </div>
          {/if}

          {#if !skipLabel}
            <slot name="header" />
          {/if}

          {#if !skipLabel && showDatePreposition}
            <span class="text-sm lower">
              <Label label={activity.string.At} />
            </span>
          {/if}

          <span class="text-sm lower">
            <MessageTimestamp date={message.createdOn ?? message.modifiedOn} />
          </span>
        </div>

        <slot name="content" />

        {#if !hideFooter}
          <Replies {embedded} object={message} />
        {/if}
        <ReactionsPresenter object={message} {readonly} />
        {#if parentMessage && showEmbedded}
          <div class="mt-2" />
          <ActivityMessagePresenter value={parentMessage} embedded hideFooter withActions={false} />
        {/if}
      </div>

      {#if withActions && !readonly}
        <div class="actions" class:opened={isActionsOpened}>
          <ActivityMessageActions
            message={isReactionMessage(message) ? parentMessage : message}
            {actions}
            {withActionMenu}
            onOpen={handleActionsOpened}
            onClose={handleActionsClosed}
          />
        </div>
      {/if}
    </div>
  {/key}
{/if}

<style lang="scss">
  @keyframes highlight {
    50% {
      background-color: var(--global-ui-highlight-BackgroundColor);
    }
  }

  .activityMessage {
    position: relative;
    display: flex;
    flex-shrink: 0;
    padding: 0.75rem 0.75rem 0.75rem 1rem;
    gap: 1rem;
    //overflow: hidden;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    width: 100%;

    &.clickable {
      cursor: pointer;
    }

    &.highlighted {
      animation: highlight 3000ms ease-in-out;
    }

    &.selected {
      background-color: var(--global-ui-highlight-BackgroundColor);
    }

    &.embedded {
      padding: 0.75rem 0 0 0;
      gap: 0.25rem;
      border-radius: 0;
    }

    .actions {
      position: absolute;
      visibility: hidden;
      top: -0.75rem;
      right: 0.75rem;

      &.opened {
        visibility: visible;
      }
    }

    &:hover > .actions {
      visibility: visible;
    }

    &.actionsOpened {
      &.borderedHover {
        border: 1px solid var(--global-ui-BackgroundColor);
      }

      &.filledHover {
        background-color: var(--global-ui-BackgroundColor);
      }
    }

    &.hoverable {
      &:hover:not(.embedded) {
        &.borderedHover {
          border: 1px solid var(--global-ui-BackgroundColor);
        }

        &.filledHover {
          background-color: var(--global-ui-BackgroundColor);
        }
      }
    }
  }

  .header {
    display: flex;
    align-items: baseline;
    font-size: 0.875rem;
    color: var(--global-secondary-TextColor);
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

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
    background-color: var(--global-higlight-Color);
    border-radius: 50%;
  }

  .embeddedMarker {
    width: 0.25rem;
    border-radius: 0.5rem;
    background: var(--global-ui-highlight-BackgroundColor);
  }

  .saveMarker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: var(--spacing-1);
    border-radius: 50%;
    background: linear-gradient(0deg, var(--button-primary-BackgroundColor), var(--button-primary-BackgroundColor)),
      linear-gradient(0deg, var(--global-ui-BackgroundColor), var(--global-ui-BackgroundColor));
    border: 1px solid var(--global-ui-BackgroundColor);
    top: -0.5rem;
    left: -0.5rem;
    color: var(--white-color);
  }

  .message-content {
    height: max-content;
    flex-shrink: 1;
    padding: 0;
  }
</style>
