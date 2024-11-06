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
  import love, { MeetingMinutes } from '@hcengineering/love'
  import { ChannelEmbeddedContent } from '@hcengineering/chunter-resources'
  import { ActivityMessage } from '@hcengineering/activity'
  import { updateTabData, WidgetState } from '@hcengineering/workbench-resources'

  export let widgetState: WidgetState
  export let meetingMinutes: MeetingMinutes
  export let height: string
  export let width: string

  function replyToThread (message: ActivityMessage): void {
    updateTabData(love.ids.MeetingWidget, 'chat', { thread: message._id })
  }

  function closeThread (): void {
    console.log('closeThread')
    updateTabData(love.ids.MeetingWidget, 'chat', { thread: undefined })
  }
</script>

<ChannelEmbeddedContent
  {width}
  {height}
  object={meetingMinutes}
  threadId={widgetState.tabs.find((tab) => tab.id === 'chat')?.data?.thread}
  collection="messages"
  on:channel={closeThread}
  onReply={replyToThread}
  on:close
/>
