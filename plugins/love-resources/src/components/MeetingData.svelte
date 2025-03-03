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
  import { Ref } from '@hcengineering/core'
  import { Room } from '@hcengineering/love'
  import { Button, CheckBox } from '@hcengineering/ui'
  import { Writable } from 'svelte/store'
  import love from '../plugin'
  import RoomSelector from './RoomSelector.svelte'

  export let state: Writable<Record<string, any>>

  function changeRoom (val: Ref<Room>): void {
    $state.room = val
  }

  function changeIsMeeting (val: boolean): void {
    $state.isMeeting = val
  }

  let isMeeting = false
</script>

<div class="flex-row-center gap-1-5 mt-1">
  <CheckBox bind:checked={isMeeting} kind={'primary'} on:value={(ev) => {
    changeIsMeeting(ev.detail)
  }}/>
  <Button
    label={love.string.CreateMeeting}
    kind={'ghost'}
    padding={'0 .5rem'}
    justify={'left'}
    on:click={() => {
      isMeeting = !isMeeting
      changeIsMeeting(isMeeting)
    }}
  />
</div>
{#if isMeeting}
  <RoomSelector
    value={$state.room}
    on:change={(ev) => {
      changeRoom(ev.detail)
    }}
  />
{/if}
