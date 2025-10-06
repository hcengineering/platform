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
  import { CardID, Markdown, Message, MessageID } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { Person } from '@hcengineering/contact'
  import { Markup } from '@hcengineering/core'
  import { translationStore } from '@hcengineering/contact-resources'
  import { ShowMore } from '@hcengineering/ui'

  import ActivityMessageViewer from './ActivityMessageViewer.svelte'
  import { toMarkup } from '../../utils'
  import { isActivityMessage } from '../../activity'
  import {
    isShownTranslatedMessage,
    TranslateMessagesStatus,
    translateMessagesStore,
    showOriginalMessagesStore
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

  $: language = $translationStore?.enabled === true ? $translationStore?.translateTo : undefined
  $: dontTranslate = $translationStore?.enabled === true ? $translationStore?.dontTranslate : []
  $: updateDisplayMarkup(message, $translateMessagesStore, $showOriginalMessagesStore, language, dontTranslate)

  function updateDisplayMarkup (
    message: Message,
    translateMessages: TranslateMessagesStatus[],
    showOriginalMessages: Array<[CardID, MessageID]>,
    language?: string,
    dontTranslate: string[] = []
  ): void {
    const translateResult = translateMessages.find((it) => it.cardId === card._id && it.messageId === message.id)
    const showOriginal = showOriginalMessages.some(([cId, mId]) => cId === card._id && mId === message.id)
    if (!showOriginal && translateResult?.result != null) {
      displayMarkup = translateResult.result
    } else if (
      language != null &&
      message.translates?.[language] != null &&
      !showOriginal &&
      !dontTranslate?.includes(language) &&
      message.language !== language
    ) {
      displayMarkup = toMarkup(message.translates[language])
    } else {
      displayMarkup = toMarkup(message.content)
    }
  }

  $: if (prevContent !== message.content) {
    prevContent = message.content
    if (isShownTranslatedMessage(message.cardId, message.id)) {
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
