<!--
//
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
//
-->

<script lang="ts">
  import type { AwarenessState, AwarenessStateMap } from '@hcengineering/text-editor'
  import { AnySvelteComponent, Button, DelayedCaller } from '@hcengineering/ui'
  import { Editor } from '@tiptap/core'
  import { onMount } from 'svelte'
  import { createRelativePositionFromJSON } from 'yjs'
  import { relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror'
  import { Provider } from '../provider/types'

  export let provider: Provider
  export let editor: Editor
  export let component: AnySvelteComponent

  let states: AwarenessState[] = []

  const debounce = new DelayedCaller(100)
  const onAwarenessChange = (): void => {
    debounce.call(() => {
      const map: AwarenessStateMap = provider.awareness?.states ?? new Map()
      const entries: Array<[number, AwarenessState]> = Array.from(map.entries())
      states = entries
        .filter(([clientId, state]) => clientId !== provider.awareness?.clientID && state.user != null)
        .map(([_, state]) => state)
    })
  }

  function goToCursor (state: AwarenessState): void {
    const cursor = state.cursor
    if (cursor?.head != null) {
      try {
        const ystate = ySyncPluginKey.getState(editor.state)
        const abs = relativePositionToAbsolutePosition(
          ystate.doc,
          ystate.type,
          createRelativePositionFromJSON(cursor.head),
          ystate.binding.mapping
        )
        if (abs != null) {
          editor.commands.focus(abs, { scrollIntoView: true })
        }
      } catch (err) {
        // relative to absolute position conversion sometimes fails
        console.error(err)
      }
    }
  }

  onMount(() => {
    provider.awareness?.on('update', onAwarenessChange)
    return () => provider.awareness?.off('update', onAwarenessChange)
  })
</script>

{#if states.length > 0}
  {#each states as state}
    <Button
      kind="icon"
      shape="round-small"
      padding="0"
      size="x-small"
      noFocus
      on:click={(e) => {
        e.preventDefault()
        e.stopPropagation()
        goToCursor(state)
      }}
    >
      <svelte:fragment slot="icon">
        <svelte:component this={component} user={state.user} lastUpdate={state.lastUpdate ?? 0} size={'x-small'} />
      </svelte:fragment>
    </Button>
  {/each}
{/if}
