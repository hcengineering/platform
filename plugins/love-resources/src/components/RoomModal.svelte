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
  import { Modal } from '@hcengineering/ui'

  import RoomComponent from './Room.svelte'
  import { activeMeeting } from '../meetings'

  const dispatch = createEventDispatcher()

  $: if ($activeMeeting === undefined) {
    dispatch('close')
  }
</script>

{#if $activeMeeting !== undefined}
  <Modal
    type="type-popup"
    okLabel={presentation.string.Create}
    hideFooter
    padding="0"
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="title">
      {$activeMeeting?.document.title}
    </svelte:fragment>
    <RoomComponent canMaximize={false} />
  </Modal>
{/if}
