<!--
//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import { onDestroy, setContext } from 'svelte'
  import * as Y from 'yjs'

  import { TiptapCollabProvider } from '../provider'
  import { CollaborationIds } from '../types'

  export let documentId: string
  export let token: string
  export let collaboratorURL: string

  export let initialContentId: string | undefined = undefined

  let _documentId = ''

  let provider: TiptapCollabProvider | undefined

  $: if (_documentId !== documentId) {
    _documentId = documentId
    if (provider !== undefined) {
      provider.disconnect()
    }
    const ydoc: Y.Doc = new Y.Doc()
    provider = new TiptapCollabProvider({
      url: collaboratorURL,
      name: documentId,
      document: ydoc,
      token,
      parameters: {
        initialContentId: initialContentId ?? ''
      }
    })
    setContext(CollaborationIds.Doc, ydoc)
    setContext(CollaborationIds.Provider, provider)
    provider.on('status', (event: any) => {
      console.log('Collaboration:', documentId, event.status) // logs "connected" or "disconnected"
    })
    provider.on('synced', (event: any) => {
      console.log('Collaboration:', event) // logs "connected" or "disconnected"
    })
  }

  onDestroy(() => {
    provider?.destroy()
  })
</script>

{#key _documentId}
  <slot />
{/key}
