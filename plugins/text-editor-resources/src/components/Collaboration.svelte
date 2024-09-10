<!--
//
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import { type Class, type CollaborativeDoc, type Doc, type Ref } from '@hcengineering/core'
  import { onDestroy, setContext } from 'svelte'
  import { CollaborationIds } from '@hcengineering/text-editor'

  import { createTiptapCollaborationData } from '../provider/utils'
  import { Provider } from '../provider/types'
  import { formatDocumentId } from '@hcengineering/collaborator-client'

  export let collaborativeDoc: CollaborativeDoc
  export let initialCollaborativeDoc: CollaborativeDoc | undefined = undefined

  export let objectClass: Ref<Class<Doc>> | undefined = undefined
  export let objectId: Ref<Doc> | undefined = undefined
  export let objectAttr: string | undefined = undefined

  let provider: Provider | undefined

  // while editing, collaborative doc may change, hence we need to
  // build stable key to ensure we don't do unnecessary updates
  $: documentId = formatDocumentId('', collaborativeDoc)

  let _documentId: string | undefined

  $: if (_documentId !== documentId) {
    _documentId = documentId

    if (provider !== undefined) {
      void provider.destroy()
    }
    const data = createTiptapCollaborationData({
      document: collaborativeDoc,
      initialDocument: initialCollaborativeDoc,
      objectClass,
      objectId,
      objectAttr
    })
    provider = data.provider
    setContext(CollaborationIds.Doc, data.ydoc)
    setContext(CollaborationIds.Provider, provider)
  }

  onDestroy(() => {
    void provider?.destroy()
  })
</script>

{#key _documentId}
  <slot />
{/key}
