<!--
//
// Copyright © 2022-2024 Hardcore Engineering Inc.
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
  import { onMount } from 'svelte'
  import { TiptapCollabProvider } from '../provider/tiptap'
  import { CollaborationUserState } from '../types'
  import contact from '@hcengineering/contact'
  import { Button, Component } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { Editor } from '@tiptap/core'
  import { createRelativePositionFromJSON } from 'yjs'
  import { relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror'

  export let provider: TiptapCollabProvider
  export let editor: Editor

  let states: CollaborationUserState[] = []

  function onAwarenessUpdate (data: { states: CollaborationUserState[] }): void {
    states = data.states.filter((x) => x.clientId !== provider.awareness?.clientID).filter((x) => x.cursor !== null)
  }

  onMount(() => {
    provider.on('awarenessUpdate', onAwarenessUpdate)
    return () => provider.off('awarenessUpdate', onAwarenessUpdate)
  })

  function goToCursor (cursor: CollaborationUserState['cursor']): void {
    if (cursor == null) return
    const yState = ySyncPluginKey.getState(editor.state)
    // Calculate cursor position same as in https://github.com/yjs/y-prosemirror/blob/master/src/plugins/cursor-plugin.js
    const abs = relativePositionToAbsolutePosition(
      provider.document,
      yState.type,
      createRelativePositionFromJSON(cursor.head),
      yState.binding.mapping
    )
    if (abs == null) return
    editor.commands.focus(abs, { scrollIntoView: true })
  }
</script>

<div class="collaboration-users">
  {#each states as state}
    <Button
      kind="icon"
      shape="round-small"
      padding="0"
      size="x-small"
      on:click={() => {
        goToCursor(state.cursor)
      }}
    >
      <svelte:fragment slot="icon">
        <div class="collaboration-user">
          <Component
            is={view.component.ObjectPresenter}
            props={{
              objectId: state.user.id,
              _class: contact.class.PersonAccount,
              shouldShowAvatar: true,
              shouldShowName: false
            }}
          />
        </div>
      </svelte:fragment>
    </Button>
  {/each}
</div>

<style lang="scss">
  .collaboration-users {
    z-index: 1000;
    position: fixed;
    display: flex;
    flex-direction: column;
    margin-left: -2.75rem;
    width: 2rem;
    gap: 1rem;
  }
  .collaboration-user {
    pointer-events: none;
    width: 1.5rem;
    * {
      pointer-events: none;
    }
  }
</style>
