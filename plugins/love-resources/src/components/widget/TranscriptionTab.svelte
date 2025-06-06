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
  import { MeetingMinutes, Room } from '@hcengineering/love'
  import { ChannelEmbeddedContent } from '@hcengineering/chunter-resources'
  import { WidgetState } from '@hcengineering/workbench-resources'
  import MeetingWidgetHeader from './MeetingWidgetHeader.svelte'

  export let widgetState: WidgetState
  export let meetingMinutes: MeetingMinutes
  export let room: Room
  export let height: string
  export let width: string
</script>

<ChannelEmbeddedContent
  {width}
  {height}
  readonly
  object={meetingMinutes}
  threadId={undefined}
  collection="transcription"
  on:close
>
  <svelte:fragment slot="header">
    <MeetingWidgetHeader doc={meetingMinutes} {room} on:close />
  </svelte:fragment>
</ChannelEmbeddedContent>
