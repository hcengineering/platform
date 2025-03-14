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
  import { MessageInput, UploadedFile } from '@hcengineering/ui-next'
  import { getCommunicationClient } from '@hcengineering/presentation'
  import { Markup } from '@hcengineering/core'
  import { markupToMarkdown } from '@hcengineering/text-markdown'
  import { markupToJSON } from '@hcengineering/text'
  import { Card } from '@hcengineering/card'

  import chat from '../plugin'

  export let card: Card

  const communicationClient = getCommunicationClient()

  async function handleSubmit (event: CustomEvent<{ message: Markup, files: UploadedFile[] }>): Promise<void> {
    const { message, files } = event.detail
    const markdown = markupToMarkdown(markupToJSON(message))
    const id = await communicationClient.createMessage(card._id, markdown)

    for (const file of files) {
      await communicationClient.createFile(card._id, id, file.blobId, file.type, file.filename)
    }
  }
</script>

<MessageInput on:submit={handleSubmit} placeholder={chat.string.MessageIn} placeholderParams={{ title: card.title }} />

<style lang="scss">
</style>
