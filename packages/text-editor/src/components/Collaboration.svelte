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
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'

  import textEditorPlugin from '../plugin'
  import { DocumentId, TiptapCollabProvider, createTiptapCollaborationData } from '../provider'
  import { CollaborationIds } from '../types'

  export let documentId: DocumentId
  export let initialContentId: DocumentId | undefined = undefined
  export let targetContentId: DocumentId | undefined = undefined

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorURL = getMetadata(textEditorPlugin.metadata.CollaboratorUrl) ?? ''

  let _documentId = ''

  let provider: TiptapCollabProvider | undefined

  $: if (_documentId !== documentId) {
    _documentId = documentId
    if (provider !== undefined) {
      provider.disconnect()
    }
    const data = createTiptapCollaborationData({
      collaboratorURL,
      documentId,
      initialContentId,
      targetContentId,
      token
    })
    provider = data.provider
    setContext(CollaborationIds.Doc, data.ydoc)
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
