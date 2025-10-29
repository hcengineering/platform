<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { LiteMessageViewer } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/card'
  import { type WithLookup } from '@hcengineering/core'
  import { Message, MessageType, SocialID } from '@hcengineering/communication-types'
  import { Person } from '@hcengineering/contact'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { markdownToMarkup } from '@hcengineering/text-markdown'
  import { jsonToMarkup, markupToText } from '@hcengineering/text'

  import ActivityMessageViewer from '../message/ActivityMessageViewer.svelte'
  import AttachmentsPreview from '../AttachmentsPreview.svelte'
  import { isActivityMessage } from '../../activity'

  import PreviewTemplate from './PreviewTemplate.svelte'

  export let card: Card
  export let message: Message | undefined = undefined
  export let socialId: SocialID
  export let date: Date
  export let color: 'primary' | 'secondary' = 'primary'
  export let kind: 'default' | 'column' = 'default'
  export let padding: string | undefined = undefined
  export let hideHeader: boolean = false
  export let hidePersonName: boolean = false

  const tooltipLimit = 512

  let person: WithLookup<Person> | undefined = undefined

  function getTooltipLabel (message: Message | undefined): IntlString {
    if (message == null) return getEmbeddedLabel('')
    const text = markupToText(jsonToMarkup(markdownToMarkup(message.content)))
    if (text.length > tooltipLimit) {
      return getEmbeddedLabel(text.substring(0, tooltipLimit) + '...')
    }
    return getEmbeddedLabel(text)
  }
</script>

<PreviewTemplate
  {kind}
  {color}
  bind:person
  {padding}
  {socialId}
  {date}
  fixHeight={message == null || message.type !== MessageType.Activity}
  tooltipLabel={getTooltipLabel(message)}
  {hideHeader}
  {hidePersonName}
>
  <svelte:fragment slot="content">
    {#if message}
      {#if isActivityMessage(message)}
        <ActivityMessageViewer {message} {card} author={person} oneRow />
      {:else}
        <LiteMessageViewer message={markdownToMarkup(message.content)} />
      {/if}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="after">
    {#if message}
      <AttachmentsPreview {message} />
    {/if}
  </svelte:fragment>
</PreviewTemplate>
