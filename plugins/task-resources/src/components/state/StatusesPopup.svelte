<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import view from '@hcengineering/view'
  import { Label, IconDelete as Delete, IconEdit } from '@hcengineering/ui'
  import task from '../../plugin'

  export let onDelete: () => void
  export let showDelete = true
  export let onUpdate: () => void

  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup">
  <div class="ap-space x2" />
  {#if showDelete}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="ap-menuItem hoverable flex-row-center redlight"
      on:click={() => {
        dispatch('close')
        onDelete()
      }}
    >
      <div class="mr-2">
        <Delete size={'small'} />
      </div>
      <Label label={task.string.Delete} />
    </div>
  {/if}
  <div
    class="ap-menuItem hoverable flex-row-center"
    on:click={() => {
      dispatch('close')
      onUpdate()
    }}
  >
    <div class="mr-2">
      <IconEdit size={'small'} />
    </div>
    <Label label={view.string.Rename} />
  </div>
  <div class="ap-space x2" />
</div>
