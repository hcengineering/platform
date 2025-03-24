<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Message, Notification } from '@hcengineering/communication-types'
  import { Message as MessagePresenter, DisplayMessage } from '@hcengineering/ui-next'
  import { jsonToMarkup } from '@hcengineering/text'
  import { markdownToMarkup } from '@hcengineering/text-markdown'

  export let notification: Notification

  function getDisplayMessage (message: Message): DisplayMessage {
    return {
      id: message.id,
      text: jsonToMarkup(markdownToMarkup(message.content)),
      author: message.creator,
      created: message.created,
      edited: message.edited,
      reactions: [],
      files: []
    }
  }
</script>

{#if notification.message}
  <div class="notification">
    <MessagePresenter editable={false} message={getDisplayMessage(notification.message)} />
  </div>
{/if}

<style lang="scss">
  .notification {
    position: relative;
    cursor: pointer;
    user-select: none;
  }
</style>
