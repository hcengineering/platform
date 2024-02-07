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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'
  import { ActionIcon, IconClose } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../plugin'

  export let attachedTo: Ref<Doc>
  export let attachedToClass: Ref<Class<Doc>>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const messagesQuery = createQuery()
  const dispatch = createEventDispatcher()

  let pinnedMessages: DisplayActivityMessage[] = []

  $: messagesQuery.query(activity.class.ActivityMessage, { attachedTo, isPinned: true }, (res: ActivityMessage[]) => {
    pinnedMessages = res as DisplayActivityMessage[]

    if (pinnedMessages.length === 0) {
      dispatch('close')
    }
  })

  async function unPinMessaage (message: ActivityMessage): Promise<void> {
    await client.update(message, { isPinned: false })
  }
</script>

<div class="antiPopup vScroll popup">
  {#each pinnedMessages as message}
    <div class="message relative">
      <ActivityMessagePresenter
        value={message}
        withActions={false}
        hoverable={false}
        skipLabel={!hierarchy.isDerived(attachedToClass, chunter.class.ChunterSpace)}
      />
      <div class="actions">
        <ActionIcon
          size="small"
          icon={IconClose}
          action={() => {
            unPinMessaage(message)
          }}
        />
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .message {
    min-width: 30rem;
    border-radius: var(--medium-BorderRadius);

    .actions {
      visibility: hidden;
      position: absolute;
      top: -0.5rem;
      right: 0.85rem;
      box-shadow: 0.25rem 0.75rem 1rem 0.125rem var(--global-popover-ShadowColor);
      border: 1px solid var(--global-subtle-ui-BorderColor);
      background: linear-gradient(0deg, var(--global-surface-01-BorderColor), var(--global-surface-01-BorderColor)),
        linear-gradient(0deg, var(--global-ui-BackgroundColor), var(--global-ui-BackgroundColor));
      padding: var(--spacing-0_5);
      border-radius: var(--small-BorderRadius);
    }

    &:hover > .actions {
      visibility: visible;
    }

    &:hover {
      background-color: var(--global-ui-BackgroundColor);
    }
  }

  .antiPopup {
    max-width: 40rem;
  }
  .popup {
    padding: 1rem;
    max-height: 24.5rem;
    color: var(--caption-color);
  }
</style>
