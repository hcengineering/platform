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
  import { AnySvelteComponent, Button, DelayedCaller } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import { Editor } from '@tiptap/core'
  import { createRelativePositionFromJSON } from 'yjs'
  import { relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror'

  import { TiptapCollabProvider } from '../provider/tiptap'
  import { AwarenessChangeEvent, CollaborationUserState } from '../types'

  export let provider: TiptapCollabProvider
  export let editor: Editor
  export let component: AnySvelteComponent

  let states: CollaborationUserState[] = []

  const debounce = new DelayedCaller(100)
  const onAwarenessChange = (event: AwarenessChangeEvent): void => {
    debounce.call(() => {
      states = event.states.filter((p) => p.user != null).filter((p) => p.clientId !== provider.awareness?.clientID)
    })
  }

  function goToCursor (state: CollaborationUserState): void {
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
    provider.on('awarenessUpdate', onAwarenessChange)
    return () => provider.off('awarenessUpdate', onAwarenessChange)
  })
</script>

{#if states.length > 0}
  <div class="container flex-col flex-gap-2 pt-2">
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
  </div>
{/if}

<style lang="scss">
  .container {
    position: sticky;
    top: 0;
    width: 1.5rem;
  }
</style>
