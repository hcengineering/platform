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
  import { MeetingMinutes } from '@hcengineering/love'

  import ControlBar from './ControlBar.svelte'
  import { currentRoom, currentMeetingMinutes } from '../stores'

  export let object: MeetingMinutes
</script>

{#if $currentRoom && $currentMeetingMinutes?._id === object._id}
  <div class="flex-grow flex-shrink">
    <ControlBar room={$currentRoom} />
  </div>
{/if}
