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
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'
  import { ActionIcon, IconClose } from '@hcengineering/ui'

  export let attachedTo: Ref<Doc>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const messagesQuery = createQuery()

  let pinnedMessages: DisplayActivityMessage[] = []

  $: messagesQuery.query(activity.class.ActivityMessage, { attachedTo, isPinned: true }, (res: ActivityMessage[]) => {
    pinnedMessages = res as DisplayActivityMessage[]
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
        skipLabel={!hierarchy.isDerived(message._class, activity.class.DocUpdateMessage)}
      />
      <div class="remove">
        <ActionIcon
          size="medium"
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
  .antiPopup {
    max-width: 40rem;
  }
  .message {
    min-width: 30rem;
  }
  .popup {
    padding: 1rem;
    max-height: 20rem;
    color: var(--caption-color);
  }
  .remove {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
  }
</style>
