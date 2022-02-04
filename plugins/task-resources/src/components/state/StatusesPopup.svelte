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
  import { Label, IconDelete as Delete } from '@anticrm/ui'
  import task from '../../plugin'

  export let onDelete: () => void
  
  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup">
  <div class="ap-space" />
  <div class="ap-menuItem ap-woScroll flex-row-center redlight" on:click={() => { dispatch('close'); onDelete() }}>
    <div class="mr-3">
      <Delete size={'small'} />
    </div>
    <Label label={task.string.Delete} />
  </div>
  <div class="ap-space" />
</div>

<!-- <style lang="scss">
  .popup {
    padding: .5rem;
    min-width: 12rem;
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0 .75rem 1.25rem rgba(0, 0, 0, .2);
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: .5rem;
    border-radius: .5rem;
    cursor: pointer;

    &:hover { background-color: var(--theme-button-bg-hovered); }
  }
</style> -->
