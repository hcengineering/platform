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
  import { OK, Severity, Status } from '@hcengineering/platform'

  export let state: Writable<Record<string, any>>
  export let setError: (error: Status) => void

  const roomRequired = new Status(Severity.ERROR, love.status.RoomRequired, {})

  function changeRoom (val: Ref<Room>): void {
    $state.room = val
    if (isMeeting && $state.room === undefined) {
      setError(roomRequired)
    } else {
      setError(OK)
    }
  }

  function changeIsMeeting (): void {
    isMeeting = !isMeeting
    $state.isMeeting = isMeeting
    if (isMeeting && $state.room === undefined) {
      setError(roomRequired)
    } else {
      setError(OK)
    }
  }

  let isMeeting = false
</script>

<div class="flex-row-center gap-1-5 mt-1">
  <CheckBox checked={isMeeting} kind={'primary'} on:value={changeIsMeeting} />
  <Button
    label={love.string.CreateMeeting}
    kind={'ghost'}
    padding={'0 .5rem'}
    justify={'left'}
    on:click={() => {
      changeIsMeeting()
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
