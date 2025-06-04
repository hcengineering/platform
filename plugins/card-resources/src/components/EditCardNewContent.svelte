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
  import { Card } from '@hcengineering/card'
  import { resizeObserver } from '@hcengineering/ui'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { Ref } from '@hcengineering/core'

  import EditCardTableOfContents from './EditCardTableOfContents.svelte'
  import { MessageInput } from '@hcengineering/communication-resources'

  export let _id: Ref<Card>
  export let doc: Card
  export let context: NotificationContext | undefined = undefined
  export let isContextLoaded: boolean = false
  export let readonly: boolean = false

  let scrollDiv: HTMLDivElement | undefined | null = undefined
  let content: EditCardTableOfContents | undefined = undefined

  let inputHeight = 0

  function onInputResize (e: Element): void {
    const delta = e.clientHeight - inputHeight
    inputHeight = e.clientHeight
    if (delta === 0) return
    content?.hideScrollBar()
    if (scrollDiv && delta > 0) {
      const bottomOffset = Math.max(
        0,
        Math.floor(scrollDiv.scrollHeight - scrollDiv.scrollTop - scrollDiv.clientHeight - delta)
      )
      if (bottomOffset < 1) {
        scrollDiv.scroll({ top: scrollDiv.scrollHeight, behavior: 'instant' })
      }
    }
  }
</script>

{#if _id === doc._id}
  {#key doc._id}
    <EditCardTableOfContents bind:this={content} bind:scrollDiv {doc} {readonly} {context} {isContextLoaded} />
  {/key}
{/if}
{#if !readonly}
  <div class="message-input" use:resizeObserver={onInputResize}>
    <MessageInput
      card={doc}
      title={doc.title}
      on:sent={() => {
        content?.hideScrollBar()
        content?.scrollDown()
      }}
    />
  </div>
{/if}

<style lang="scss">
  .message-input {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    padding: 0 0.75rem;
    max-height: 50%;
    margin-top: auto;
  }
</style>
