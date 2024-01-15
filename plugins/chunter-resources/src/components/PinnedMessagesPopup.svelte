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
  import { createQuery } from '@hcengineering/presentation'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'

  export let attachedTo: Ref<Doc>

  const messagesQuery = createQuery()

  let pinnedMessages: DisplayActivityMessage[] = []

  $: messagesQuery.query(activity.class.ActivityMessage, { attachedTo, isPinned: true }, (res: ActivityMessage[]) => {
    pinnedMessages = res as DisplayActivityMessage[]
  })
</script>

<div class="antiPopup vScroll popup">
  {#each pinnedMessages as message}
    <ActivityMessagePresenter value={message} withActions={false} />
  {/each}
</div>

<style lang="scss">
  .popup {
    padding: 1.25rem 1.25rem 1.25rem;
    max-height: 20rem;
    color: var(--caption-color);
  }
</style>
