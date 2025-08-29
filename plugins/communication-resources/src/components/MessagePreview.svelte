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
  import { Message, SocialID } from '@hcengineering/communication-types'
  import { Person } from '@hcengineering/contact'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { employeeByPersonIdStore, getPersonByPersonId } from '@hcengineering/contact-resources'
  import { markdownToMarkup } from '@hcengineering/text-markdown'
  import { jsonToMarkup, markupToText } from '@hcengineering/text'
  import { tooltip } from '@hcengineering/ui'

  import { isActivityMessage } from '../activity'
  import ActivityMessageViewer from './message/ActivityMessageViewer.svelte'
  import AttachmentsPreview from './AttachmentsPreview.svelte'

  export let card: Card
  export let message: Message
  export let colorInherit: boolean = false

  const tooltipLimit = 512

  let person: WithLookup<Person> | undefined = undefined

  $: void updatePerson(message.creator)

  function getTooltipLabel (message: Message): IntlString {
    const text = markupToText(jsonToMarkup(markdownToMarkup(message.content)))
    if (text.length > tooltipLimit) {
      return getEmbeddedLabel(text.substring(0, tooltipLimit) + '...')
    }
    return getEmbeddedLabel(text)
  }

  async function updatePerson (socialId: SocialID): Promise<void> {
    person = $employeeByPersonIdStore.get(socialId) ?? (await getPersonByPersonId(socialId)) ?? undefined
  }
</script>

<span class="message-preview overflow-label" use:tooltip={{ label: getTooltipLabel(message) }}>
  {#if isActivityMessage(message)}
    <ActivityMessageViewer {message} {card} author={person} />
  {:else}
    <LiteMessageViewer message={markdownToMarkup(message.content)} {colorInherit} />
  {/if}
  <AttachmentsPreview {message} />
</span>
