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
  import activity, {
    ActivityMessageViewlet,
    DisplayActivityMessage,
    ActivityMessageViewType
  } from '@hcengineering/activity'
  import { Person } from '@hcengineering/contact'
  import { Avatar, EmployeePresenter, SystemAvatar } from '@hcengineering/contact-resources'
  import core, { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Action, Icon, Label } from '@hcengineering/ui'
  import { getActions, restrictionStore, showMenu } from '@hcengineering/view-resources'
  import { Asset } from '@hcengineering/platform'
  import { Action as ViewAction } from '@hcengineering/view'

  import ReactionsPresenter from '../reactions/ReactionsPresenter.svelte'
  import ActivityMessagePresenter from './ActivityMessagePresenter.svelte'
  import ActivityMessageActions from '../ActivityMessageActions.svelte'
  import { isReactionMessage } from '../../activityMessagesUtils'
  import { savedMessagesStore } from '../../activity'
  import MessageTimestamp from '../MessageTimestamp.svelte'
  import Replies from '../Replies.svelte'
  import { MessageInlineAction } from '../../types'
  import InlineAction from './InlineAction.svelte'

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
  export let pending = false
  export let stale = false
  export let hoverStyles: 'borderedHover' | 'filledHover' = 'borderedHover'
  export let showDatePreposition = false
  export let type: ActivityMessageViewType = 'default'
  export let inlineActions: MessageInlineAction[] = []
  export let excludedActions: Ref<ViewAction>[] = []
  export let onClick: (() => void) | undefined = undefined

  export let socialIcon: Asset | undefined = undefined

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

  function canDisplayShort (type: ActivityMessageViewType, isSaved: boolean): boolean {
    return type === 'short' && !isSaved && (message.replies ?? 0) === 0
  }

  $: isShort = canDisplayShort(type, isSaved)

  function isInside (x: number, y: number, rect: DOMRect): boolean {
    return x >= rect.left && y >= rect.top && x <= rect.right && y <= rect.bottom
  }

  function isTextClicked (element: HTMLElement | null, x: number, y: number): boolean {
    if (element == null) {
      return false
    }

    const nodes = element.childNodes
    const range = document.createRange()

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]

      if (node.nodeType !== Node.TEXT_NODE) continue

      range.selectNodeContents(node)

      if (isInside(x, y, range.getBoundingClientRect())) {
        return true
      }
    }
    return false
  }

  function handleContextMenu (event: MouseEvent): void {
    const showCustomPopup = !isTextClicked(event.target as HTMLElement, event.clientX, event.clientY)
    if (showCustomPopup) {
      showMenu(event, { object: message, baseMenuClass: activity.class.ActivityMessage }, () => {
        isActionsOpened = false
      })
      isActionsOpened = true
    }
  }
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
      class:stale
      on:click={onClick}
      on:contextmenu={handleContextMenu}
    >
      {#if showNotify && !embedded && !isShort}
        <div class="notify" />
      {/if}
      {#if embedded}
        <div class="embeddedMarker" />
      {:else if isShort}
        <span class="text-sm lower time">
          <MessageTimestamp date={message.createdOn ?? message.modifiedOn} shortTime />
        </span>
      {:else}
        <div class="avatar mt-1 relative flex-no-shrink">
          {#if $$slots.icon}
            <slot name="icon" />
          {:else if person}
            <Avatar size="medium" {person} name={person.name} />
          {:else}
            <SystemAvatar size="medium" />
          {/if}
          {#if isSaved}
            <div class="saveMarker">
              <Icon icon={activity.icon.BookmarkFilled} size="xx-small" />
            </div>
          {/if}
          {#if socialIcon}
            <div class="socialIcon">
              <Icon icon={socialIcon} size="x-small" />
            </div>
          {/if}
        </div>
      {/if}
      <div class="flex-col ml-2 w-full clear-mins message-content">
        {#if !isShort}
          <div class="header clear-mins">
            {#if person}
              <div class="username">
                <EmployeePresenter value={person} shouldShowAvatar={false} compact />
              </div>
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

            {#if withActions && inlineActions.length > 0 && !readonly}
              <div class="flex-presenter flex-gap-2 ml-2">
                {#each inlineActions as item}
                  <InlineAction {item} />
                {/each}
              </div>
            {/if}
          </div>
        {/if}

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
        <div class="actions" class:pending class:opened={isActionsOpened}>
          <ActivityMessageActions
            message={isReactionMessage(message) ? parentMessage : message}
            {actions}
            {withActionMenu}
            {excludedActions}
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
      background-color: var(--global-ui-hover-highlight-BackgroundColor);
    }
  }

  .activityMessage {
    position: relative;
    display: flex;
    flex-shrink: 0;
    padding: 0.5rem 0.75rem 0.5rem 1rem;
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

      &.opened:not(.pending) {
        visibility: visible;
      }
    }

    &:hover > .actions {
      &:not(.pending) {
        visibility: visible;
      }
    }

    &:hover > .time {
      visibility: visible;
    }

    .time {
      display: flex;
      justify-content: end;
      width: 2.5rem;
      min-width: 2.5rem;
      visibility: hidden;
      margin-top: 0.125rem;
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

    &.stale {
      opacity: 0.5;
    }
  }

  .avatar {
    width: 2.5rem;
    height: 2.5rem;
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

  .socialIcon {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: var(--spacing-1);
    border-radius: 50%;
    background: var(--theme-bg-color);
    border: 1px solid var(--global-ui-BorderColor);
    bottom: -0.375rem;
    right: -0.375rem;
    color: var(--content-color);
  }

  .username {
    font-weight: 500;
    margin-right: 0.25rem;
  }
</style>
