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
  import { location, Location } from '@hcengineering/ui'
  import { loveId, Room, Office } from '@hcengineering/love'

  import ControlBar from './ControlBar.svelte'
  import { isConnected } from '../utils'
  import { currentRoom, myOffice } from '../stores'

  function showControlBar (room: Room, loc: Location, myOffice?: Office): boolean {
    if (loc.path[2] !== loveId) return false
    if (room._id !== myOffice?._id) return true

    return $isConnected
  }
  </script>

{#if $currentRoom && showControlBar($currentRoom, $location, $myOffice)}
  <div class="flex-grow flex-shrink" >
  <ControlBar room={$currentRoom} />
  </div>
{/if}
