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
  import { Markdown, Message } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { Person } from '@hcengineering/contact'
  import { Markup } from '@hcengineering/core'
  import { ShowMore } from '@hcengineering/ui'

  import ActivityMessageViewer from './ActivityMessageViewer.svelte'
  import { toMarkup } from '../../utils'
  import { isActivityMessage } from '../../activity'
  import {
    isShownManualTranslatedMessage,
    translateMessagesStore,
    showOriginalMessagesStore,
    getMessageTranslation,
    translateToStore,
    dontTranslateStore
  } from '../../stores'
  import { translateMessage } from '../../actions'

  export let card: Card
  export let message: Message
  export let author: Person | undefined
  export let collapsible: boolean = true
  export let maxHeight: string = '30rem'
  export let isShowMoreActive: boolean = false

  let displayMarkup: Markup = toMarkup(message.content)
  let prevContent: Markdown | undefined = undefined

  $: translatedMarkup = getMessageTranslation(
    message,
    $translateToStore,
    $dontTranslateStore,
    $translateMessagesStore,
    $showOriginalMessagesStore
  )
  $: displayMarkup = translatedMarkup ?? toMarkup(message.content)

  $: if (prevContent !== message.content) {
    prevContent = message.content
    if (isShownManualTranslatedMessage(message.cardId, message.id)) {
      void translateMessage(message, card)
    } else {
      translateMessagesStore.update((store) => {
        return store.filter((it) => it.cardId !== message.cardId || it.messageId !== message.id)
      })
    }
  }

  function getMaxSize (maxHeight: string): number {
    const remValue = parseFloat(maxHeight.replace('rem', ''))
    if (isNaN(remValue) || remValue <= 0) {
      return 480 // 30rem * 16px
    }
    return remValue * 16
  }
</script>

<ShowMore limit={getMaxSize(maxHeight)} ignore={!collapsible} bind:bigger={isShowMoreActive}>
  {#if isActivityMessage(message)}
    <ActivityMessageViewer {message} {card} {author} />
  {:else}
    <MarkupMessageViewer message={displayMarkup} />
  {/if}
</ShowMore>
