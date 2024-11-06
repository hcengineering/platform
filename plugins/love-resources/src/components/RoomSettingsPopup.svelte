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
  import { Modal, NavItem } from '@hcengineering/ui'
  import presentation from '@hcengineering/presentation'
  import { Room } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@hcengineering/platform'

  import RoomTranscriptionSettings from './RoomTranscriptionSettings.svelte'
  import love from '../plugin'

  export let room: Room

  const dispatch = createEventDispatcher()

  interface Group { id: string, label: IntlString }

  const groups: Group[] = [{ id: 'transcription', label: love.string.Transcription }]

  let selectedGroup = groups[0]

  function selectGroup (group: Group): void {
    selectedGroup = group
  }
</script>

<Modal
  label={love.string.Settings}
  type="type-popup"
  okLabel={presentation.string.Close}
  okAction={() => {
    dispatch('close')
  }}
  canSave={true}
  showCancelButton={false}
  on:close
>
  <div class="content">
    <div class="groups">
      {#each groups as group}
        <NavItem
          label={group.label}
          selected={group.id === selectedGroup?.id}
          on:click={() => {
            selectGroup(group)
          }}
        />
      {/each}
    </div>
    <div class="component">
      {#if selectedGroup.id === 'transcription'}
        <RoomTranscriptionSettings {room}/>
      {/if}
    </div>
  </div>
</Modal>

<style lang="scss">
  .content {
    display: flex;
    gap: 1rem;
    height: 20rem;
  }

  .groups {
    padding-right: 0.5rem;
    width: 12rem;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--global-ui-BorderColor);
  }

  .component {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 0.5rem;
  }
</style>
