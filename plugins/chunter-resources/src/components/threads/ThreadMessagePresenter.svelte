<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { ThreadMessage } from '@hcengineering/chunter'
  import ChatMessagePresenter from '../chat-message/ChatMessagePresenter.svelte'

  export let value: ThreadMessage | undefined
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let showEmbedded = false
  export let skipLabel = false
  export let withFlatActions: boolean = true
  export let onClick: (() => void) | undefined = undefined
  export let onReply: (() => void) | undefined = undefined
</script>

<ChatMessagePresenter
  {value}
  {showNotify}
  {isHighlighted}
  {isSelected}
  {shouldScroll}
  {withActions}
  {showEmbedded}
  {embedded}
  {skipLabel}
  {withFlatActions}
  {onClick}
  {onReply}
/>
