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
  import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  import Hall from './Hall.svelte'
  import { currentRoom } from '../stores'
  import { isConnected } from '../utils'
  import ActiveMeeting from './ActiveMeeting.svelte'

  const localNav: boolean = $deviceInfo.navigator.visible
  const savedNav = localStorage.getItem('love-visibleNav')
  if (savedNav !== undefined) $deviceInfo.navigator.visible = savedNav === 'true'
  $: localStorage.setItem('love-visibleNav', JSON.stringify($deviceInfo.navigator.visible))

  onDestroy(() => {
    $deviceInfo.navigator.visible = localNav
  })
</script>

<div class="hulyPanels-container">
  {#if $currentRoom && $isConnected}
    <ActiveMeeting room={$currentRoom} />
  {:else}
    <Hall />
  {/if}
</div>
