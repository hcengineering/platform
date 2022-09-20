<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import { Doc } from '@hcengineering/core'
  import { IconMoreH, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  export let label: string = ''
  export let active: boolean = false
  export let object: Doc | undefined

  const dispatch = createEventDispatcher()

  const showMenu = async (ev: MouseEvent, object?: Doc): Promise<void> => {
    if (object !== undefined) {
      showPopup(ContextMenu, { object }, ev.target as HTMLElement)
    }
  }
</script>

<div
  class="flex-between ac-column__list-item"
  class:active
  on:click|stopPropagation={() => {
    dispatch('click')
  }}
>
  {label}
  {#if object}
    <div
      class="hover-trans"
      on:click|stopPropagation={(ev) => {
        showMenu(ev, object)
      }}
    >
      <IconMoreH size={'medium'} />
    </div>
  {/if}
</div>
