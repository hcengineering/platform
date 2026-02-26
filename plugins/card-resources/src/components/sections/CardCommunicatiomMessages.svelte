<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { MessagesSection } from '@hcengineering/communication-resources'
  import { NotificationContext } from '@hcengineering/communication-types'

  export let doc: Card
  export let readonly: boolean = false
  export let scrollDiv: HTMLDivElement | undefined | null = undefined
  export let context: NotificationContext | undefined = undefined
  export let contentDiv: HTMLDivElement
  export let isContextLoaded: boolean = false
  export let active: boolean = false
  export let isDefault: boolean = false
  export let onRenderTopChange: (active: boolean) => void

  let messagesSection: MessagesSection | undefined

  // Expose scrolling/editing helpers so the parent TOC component can control this section.
  export function scrollDown (): void {
    messagesSection?.scrollDown()
  }

  export function canScrollDown (): boolean {
    return messagesSection?.canScrollDown() ?? false
  }

  export function editLastMessage (): void {
    messagesSection?.editLastMessage()
  }
</script>

<MessagesSection
  bind:this={messagesSection}
  {doc}
  {readonly}
  {isContextLoaded}
  {scrollDiv}
  {context}
  {contentDiv}
  {active}
  {isDefault}
  on:top-loaded={() => {
    onRenderTopChange(true)
  }}
  on:top-hidden={() => {
    onRenderTopChange(false)
  }}
  on:loaded
  on:change
  on:action
/>
