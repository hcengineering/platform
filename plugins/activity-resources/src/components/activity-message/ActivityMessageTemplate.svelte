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
    ActivityMessageExtension,
    ActivityMessageViewlet,
    DisplayActivityMessage
  } from '@hcengineering/activity'
  import { Person } from '@hcengineering/contact'
  import { Avatar, EmployeePresenter, SystemAvatar } from '@hcengineering/contact-resources'
  import core, { getDisplayTime } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Action, ActionIcon, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import { Menu, getActions } from '@hcengineering/view-resources'

  import AddReactionAction from '../reactions/AddReactionAction.svelte'
  import ReactionsPresenter from '../reactions/ReactionsPresenter.svelte'
  import ActivityMessageExtensionComponent from './ActivityMessageExtension.svelte'
  import ActivityMessagePresenter from './ActivityMessagePresenter.svelte'
  import PinMessageAction from './PinMessageAction.svelte'
  import Replies from '../Replies.svelte'
  import SaveMessageAction from '../SaveMessageAction.svelte'

  export let message: DisplayActivityMessage
  export let parentMessage: DisplayActivityMessage | undefined = undefined

  export let viewlet: ActivityMessageViewlet | undefined = undefined
  export let person: Person | undefined = undefined
  export let actions: Action[] = []
  export let excludedActions: string[] = []
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let withFlatActions: boolean = true
  export let showEmbedded = false
  export let hideReplies = false
  export let skipLabel = false
  export let hoverable = true
  export let onClick: (() => void) | undefined = undefined
  export let onReply: (() => void) | undefined = undefined

  const client = getClient()
  let allActionIds: string[] = []

  let element: HTMLDivElement | undefined = undefined
  let extensions: ActivityMessageExtension[] = []
  let isActionMenuOpened = false

  $: withActions &&
    getActions(client, message, activity.class.ActivityMessage).then((res) => {
      allActionIds = res.map(({ _id }) => _id)
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

  void client
    .findAll(activity.class.ActivityMessageExtension, { ofMessage: message._class })
    .then((res: ActivityMessageExtension[]) => {
      extensions = res
    })

  function handleActionMenuOpened (): void {
    isActionMenuOpened = true
  }

  function handleActionMenuClosed (): void {
    isActionMenuOpened = false
  }

  $: key = parentMessage != null ? `${message._id}_${parentMessage._id}` : message._id

  function showMenu (ev: MouseEvent): void {
    showPopup(
      Menu,
      {
        object: message,
        baseMenuClass: activity.class.ActivityMessage,
        excludedActions,
        actions
      },
      ev.target as HTMLElement,
      handleActionMenuClosed
    )
    handleActionMenuOpened()
  }

  $: isHidden = !!viewlet?.onlyWithParent && parentMessage === undefined
  $: withActionMenu =
    withActions && !embedded && (actions.length > 0 || allActionIds.some((id) => !excludedActions.includes(id)))
</script>

{#if !isHidden}
  {#key key}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      bind:this={element}
      id={message._id}
      class="root clear-mins"
      class:clickable={!!onClick}
      class:highlighted={isHighlighted}
      class:selected={isSelected}
      class:hoverable
      class:embedded
      on:click={onClick}
    >
      {#if showNotify && !embedded}
        <div class="notify" />
      {/if}
      {#if !embedded}
        <div class="min-w-6 mt-1">
          {#if $$slots.icon}
            <slot name="icon" />
          {:else if person}
            <Avatar size="medium" avatar={person.avatar} name={person.name} />
          {:else}
            <SystemAvatar size="medium" />
          {/if}
        </div>
      {:else}
        <div class="embeddedMarker" />
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

          {#if !skipLabel}
            <slot name="header" />
          {/if}
          <span class="text-sm">{getDisplayTime(message.createdOn ?? 0)}</span>
        </div>

        <slot name="content" />

        {#if !hideReplies && message.replies && message.replies > 0}
          <div class="mt-2" />
          <Replies {message} {onReply} />
        {/if}
        <ActivityMessageExtensionComponent kind="footer" {extensions} props={{ object: message }} />

        <ReactionsPresenter object={message} />
        {#if parentMessage && showEmbedded}
          <div class="mt-2" />
          <ActivityMessagePresenter value={parentMessage} embedded hideReplies withActions={false} />
        {/if}
      </div>

      <div
        class="actions clear-mins flex flex-gap-2 items-center"
        class:opened={isActionMenuOpened || message.isPinned}
      >
        {#if withActions}
          {#if withFlatActions}
            <AddReactionAction object={message} />
            <PinMessageAction object={message} />
            <SaveMessageAction object={message} />

            <ActivityMessageExtensionComponent
              kind="action"
              {extensions}
              props={{ object: message }}
              on:close={handleActionMenuClosed}
              on:open={handleActionMenuOpened}
            />
          {/if}
          {#if withActionMenu}
            <ActionIcon icon={IconMoreH} size="small" action={showMenu} />
          {/if}
        {/if}
      </div>
    </div>
  {/key}
{/if}

<style lang="scss">
  @keyframes highlight {
    50% {
      background-color: var(--theme-warning-color);
    }
  }

  .root {
    position: relative;
    display: flex;
    flex-shrink: 0;
    padding: 0.75rem 0.75rem 0.75rem 1.25rem;
    gap: 1rem;
    overflow: hidden;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    width: 100%;

    &.clickable {
      cursor: pointer;
    }

    &.highlighted {
      animation: highlight 5000ms ease-in-out;
    }

    &.selected {
      background-color: var(--highlight-select);
    }

    &.embedded {
      padding: 0;

      .content {
        padding: 0.75rem 0.75rem 0.75rem 0;
      }
    }

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

    &.hoverable {
      &:hover:not(.embedded) {
        border: 1px solid var(--highlight-hover);
      }
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

  .embeddedMarker {
    width: 6px;
    border-radius: 0.5rem;
    background: var(--secondary-button-default);
  }
</style>
