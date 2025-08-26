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
  import { createEventDispatcher } from 'svelte'
  import presentation from '@hcengineering/presentation'
  import { ButtonIcon, IconDelete, Label, Modal } from '@hcengineering/ui'
  import love, { RoomType } from '@hcengineering/love'

  import { currentRoom } from '../stores'
  import RoomComponent from './Room.svelte'
  import { screenSharing } from '../utils'

  const dispatch = createEventDispatcher()

  $: if ($currentRoom === undefined || (!$screenSharing && $currentRoom.type !== RoomType.Video)) {
    dispatch('close')
  }
</script>

{#if ($currentRoom !== undefined && $screenSharing) || $currentRoom?.type === RoomType.Video}
  <Modal
    type="type-popup"
    okLabel={presentation.string.Create}
    hideFooter
    padding="0"
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="title">
      {$currentRoom.name}
    </svelte:fragment>
    <RoomComponent withVideo={$currentRoom.type === RoomType.Video} room={$currentRoom} canMaximize={false} />
  </Modal>
{/if}
