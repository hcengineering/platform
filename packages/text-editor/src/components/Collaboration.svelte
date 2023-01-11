<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { WebsocketProvider } from 'y-websocket'
  import * as Y from 'yjs'
  import { CollaborationIds } from '../types'
  export let documentId: string
  export let token: string
  export let collaboratorURL: string

  export let initialContentId: string | undefined = undefined

  let _documentId = ''

  let wsProvider: WebsocketProvider | undefined

  $: if (_documentId !== documentId) {
    _documentId = documentId
    if (wsProvider !== undefined) {
      wsProvider.disconnect()
    }
    const ydoc: Y.Doc = new Y.Doc()
    wsProvider = new WebsocketProvider(collaboratorURL, documentId, ydoc, {
      params: {
        token,
        documentId,
        initialContentId: initialContentId ?? ''
      }
    })
    setContext(CollaborationIds.Doc, ydoc)
    setContext(CollaborationIds.Provider, wsProvider)
    wsProvider.on('status', (event: any) => {
      console.log('Collaboration:', documentId, event.status) // logs "connected" or "disconnected"
    })
    wsProvider.on('synched', (event: any) => {
      console.log('Collaboration:', event) // logs "connected" or "disconnected"
    })
  }

  onDestroy(() => {
    wsProvider?.disconnect()
  })
</script>

{#key _documentId}
  <slot />
{/key}
