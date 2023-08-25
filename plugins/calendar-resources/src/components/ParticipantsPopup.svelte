<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Person } from '@hcengineering/contact'
  import { PersonRefPresenter } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { ListView } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let participants: Ref<Person>[]

  const dispatch = createEventDispatcher()

  function select (participant: Ref<Person>): void {
    dispatch('close', participant)
  }

  let list: ListView
  const selection = 0

  function onKeyDown (key: KeyboardEvent): boolean {
    if (key.key === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
      return true
    }
    if (key.key === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.key === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const item = participants[selection]
      if (item) {
        select(item)
        return true
      } else {
        return false
      }
    }
    return false
  }
</script>

<div class="antiPopup thinStyle" on:keydown={onKeyDown}>
  <div class="ap-space x1-5" />
  <div class="ap-scroll">
    <div class="ap-box">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <ListView bind:this={list} count={participants.length} kind={'thin'}>
        <svelte:fragment slot="item" let:item>
          {@const doc = participants[item]}
          <div class="ap-menuItem withComp noMargin" on:click={() => select(doc)}>
            <PersonRefPresenter disabled value={doc} />
          </div>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class="ap-space x1-5" />
</div>
