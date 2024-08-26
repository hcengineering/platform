<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { ModernButton } from '@hcengineering/ui'
  import chunter, { ChatMessage, InlineButton } from '@hcengineering/chunter'
  import { createQuery } from '@hcengineering/presentation'
  import { getResource } from '@hcengineering/platform'

  export let value: ChatMessage
  export let inlineButtons: InlineButton[] = []

  const query = createQuery()

  $: if ((value.inlineButtons ?? 0) > 0 && inlineButtons.length === 0) {
    query.query(chunter.class.InlineButton, { attachedTo: value._id, space: value.space }, (res) => {
      inlineButtons = res
    })
  } else {
    query.unsubscribe()
  }

  async function handleInlineButtonClick (button: InlineButton): Promise<void> {
    const resource = await getResource(button.action)
    await resource(button, value._id, value.attachedTo)
  }
</script>

{#each inlineButtons as button}
  <ModernButton
    title={button.title}
    label={button.titleIntl}
    size="small"
    on:click={() => {
      void handleInlineButtonClick(button)
    }}
  />
{/each}
