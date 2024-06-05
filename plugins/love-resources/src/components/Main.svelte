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
  import { RoomType } from '@hcengineering/love'
  import { currentRoom } from '../stores'
  import { screenSharing } from '../utils'
  import Hall from './Hall.svelte'
  import RoomComponent from './Room.svelte'

  export let visibleNav: boolean = true
  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'

  const saved = localStorage.getItem('love-visibleNav')
  if (saved !== undefined) visibleNav = saved === 'true'
  $: localStorage.setItem('love-visibleNav', JSON.stringify(visibleNav))
</script>

<div class="hulyPanels-container" class:left-divider={$screenSharing || $currentRoom?.type === RoomType.Video}>
  {#if ($currentRoom !== undefined && $screenSharing) || $currentRoom?.type === RoomType.Video}
    <RoomComponent withVideo={$currentRoom.type === RoomType.Video} room={$currentRoom} />
  {:else}
    <Hall bind:visibleNav {navFloat} {appsDirection} />
  {/if}
</div>
