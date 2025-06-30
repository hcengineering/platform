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
  import { MessageViewer as MarkupMessageViewer } from '@hcengineering/presentation'
  import { Markdown, Message, MessageID } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { Label } from '@hcengineering/ui'
  import { Person } from '@hcengineering/contact'
  import { Markup } from '@hcengineering/core'

  import ActivityMessageViewer from './ActivityMessageViewer.svelte'
  import { toMarkup } from '../../utils'
  import { isActivityMessage } from '../../activity'
  import communication from '../../plugin'
  import { isShownTranslatedMessage, TranslateMessagesStatus, translateMessagesStore } from '../../stores'
  import { translateMessage } from '../../actions'

  export let card: Card
  export let message: Message
  export let author: Person | undefined

  let displayMarkup: Markup = toMarkup(message.content)
  let prevContent: Markdown | undefined = undefined

  $: updateDisplayMarkup(message, $translateMessagesStore)

  function updateDisplayMarkup (message: Message, translateMessages: Map<MessageID, TranslateMessagesStatus>): void {
    const translateResult = translateMessages.get(message.id)
    if (translateResult?.shown === true && translateResult?.result != null) {
      displayMarkup = translateResult.result
    } else {
      displayMarkup = toMarkup(message.content)
    }
  }

  $: if (prevContent !== message.content) {
    prevContent = message.content
    if (isShownTranslatedMessage(message.id)) {
      void translateMessage(message, card)
    } else {
      translateMessagesStore.update((store) => {
        store.delete(message.id)
        return store
      })
    }
  }
</script>

{#if isActivityMessage(message)}
  <ActivityMessageViewer {message} {card} {author} />
{:else if message.removed}
  <span class="overflow-label removed-label">
    <Label label={communication.string.MessageWasRemoved} />
  </span>
{:else}
  <MarkupMessageViewer message={displayMarkup} />
{/if}

<style lang="scss">
  .removed-label {
    color: var(--theme-text-placeholder-color);
  }
</style>
