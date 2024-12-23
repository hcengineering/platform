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
  import { Event } from '@hcengineering/calendar'
  import love from '../plugin'
  import RoomSelector from './RoomSelector.svelte'
  import { getClient } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'
  import { Room } from '@hcengineering/love'

  export let value: Event

  $: isMeeting = getClient().getHierarchy().hasMixin(value, love.mixin.Meeting)
  $: meeting = isMeeting ? getClient().getHierarchy().as(value, love.mixin.Meeting) : null

  async function changeRoom (val: Ref<Room>): Promise<void> {
    await getClient().updateMixin(value._id, value._class, value.space, love.mixin.Meeting, { room: val })
  }
</script>

{#if isMeeting && meeting}
  <RoomSelector value={meeting?.room} on:change={(ev) => changeRoom(ev.detail)} />
{/if}
