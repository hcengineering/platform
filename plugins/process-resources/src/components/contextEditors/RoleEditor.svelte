<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import card, { MasterTag, Role, Tag } from '@hcengineering/card'
  import { AnyAttribute, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ProcessFunction, SelectedContext } from '@hcengineering/process'
  import { resizeObserver, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getContextFunctionReduce } from '../../utils'

  export let context: ProcessFunction
  export let masterTag: Ref<MasterTag | Tag>
  export let target: AnyAttribute
  export let onSelect: (val: SelectedContext) => void

  const dispatch = createEventDispatcher()
  const client = getClient()

  const elements: HTMLButtonElement[] = []

  const keyDown = (event: KeyboardEvent, index: number): void => {
    if (event.key === 'ArrowDown') {
      elements[(index + 1) % elements.length].focus()
    }

    if (event.key === 'ArrowUp') {
      elements[(elements.length + index - 1) % elements.length].focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')
    }
  }

  function onValue (role: Ref<Role>): void {
    const pathReduce = getContextFunctionReduce(context, target)
    onSelect({
      type: 'function',
      func: context._id,
      key: target.name,
      functions: [],
      sourceFunction: pathReduce,
      props: {
        target: role
      }
    })
  }

  const ancestors = client.getHierarchy().getAncestors(masterTag)
  const roles = client.getModel().findAllSync(card.class.Role, { attachedTo: { $in: ancestors } })
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    {#each roles as role, i}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        bind:this={elements[i]}
        on:keydown={(event) => {
          keyDown(event, i)
        }}
        on:mouseover={() => {
          elements[i]?.focus()
        }}
        on:click={() => {
          onValue(role._id)
        }}
        class="menu-item"
      >
        <span class="overflow-label pr-1">
          {role.name}
        </span>
      </button>
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>
